from django.urls import path, include
from rest_framework import routers
from . import views

router = routers.DefaultRouter()
router.register('users', views.UserViewSet)
router.register('flavors', views.FlavorViewSet)
router.register('categories', views.CategoryViewSet)
router.register('ratings', views.RatingViewSet)
router.register('replies', views.ReplyViewSet)
router.register('notifications', views.NotificationViewSet, basename='notification')
router.register('tickets', views.TicketViewSet, basename='ticket')
router.register('admin-custom', views.AdminViewSet, basename='admin-custom')

urlpatterns = [
    path('', include(router.urls)),
]
