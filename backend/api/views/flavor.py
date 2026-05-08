from django.db.models import Avg
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from api.models import Category, Flavor
from api.serializers import CategorySerializer, FlavorSerializer
from api.services.search import (
    extract_category_slug,
    filter_flavors_by_query,
    score_relevance,
)
from api.utils.auth import current_user


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class FlavorViewSet(viewsets.ModelViewSet):
    queryset = Flavor.objects.annotate(average_rating=Avg("ratings__score")).order_by(
        "-average_rating"
    )
    serializer_class = FlavorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["category", "category__slug"]
    search_fields = ["name", "description"]
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = (
            Flavor.objects.select_related("category")
            .annotate(average_rating=Avg("ratings__score"))
            .order_by("-average_rating")
            .distinct()
        )
        search_query = self.request.query_params.get("search", "")
        slug, _ = extract_category_slug(search_query)
        if slug:
            qs = qs.filter(category__slug=slug)
        return qs

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def search(self, request: Request) -> Response:
        query = request.query_params.get("q", "").lower().strip()
        if not query:
            return Response([])

        flavors = Flavor.objects.select_related("category").distinct()
        flavors = filter_flavors_by_query(flavors, query)

        _, remaining = extract_category_slug(query)
        seen_keys: set[str] = set()
        results: list[dict] = []

        for f in flavors.order_by("name"):
            key = f"{f.name.strip().lower()}|{f.category.slug}"
            if key in seen_keys:
                continue
            seen_keys.add(key)
            results.append(
                {
                    "id": f.id,
                    "name": f.name,
                    "type": "flavor",
                    "subtitle": f.category.name,
                    "image_url": (
                        request.build_absolute_uri(f.image.url) if f.image else f.image_url
                    ),
                    "slug": None,
                    "relevance": score_relevance(f.name, remaining),
                }
            )

        results.sort(key=lambda x: (-x["relevance"], x["name"]))
        for r in results:
            del r["relevance"]
        return Response(results[:15])

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def top(self, request: Request) -> Response:
        queryset = self.get_queryset().filter(ratings__isnull=False)
        category_slug = request.query_params.get("category")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        top_flavors = queryset.distinct()[:10]
        return Response(self.get_serializer(top_flavors, many=True).data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def newest(self, request: Request) -> Response:
        newest_flavors = Flavor.objects.select_related("category").order_by("-created_at")[:10]
        return Response(self.get_serializer(newest_flavors, many=True).data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def followed_top(self, request: Request) -> Response:
        followed_users = current_user(request).following.all()
        top_flavors = (
            Flavor.objects.filter(ratings__user__in=followed_users)
            .annotate(average_rating=Avg("ratings__score"))
            .order_by("-average_rating")
            .distinct()[:10]
        )
        return Response(self.get_serializer(top_flavors, many=True).data)
