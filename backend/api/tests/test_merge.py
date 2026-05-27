from django.test import TestCase
from api.models import Category, Flavor, Rating, Reply, User
from api.services.flavor import merge_flavors
from api.management.commands.cleanup_duplicates import Command
from io import StringIO

class FlavorMergeTests(TestCase):
    def setUp(self):
        self.cat = Category.objects.create(name="Energy", slug="energy")
        self.user1 = User.objects.create_user(username="user1")
        self.user2 = User.objects.create_user(username="user2")
        
        self.keep = Flavor.objects.create(name="Dolphin Daiquiri", category=self.cat)
        self.remove = Flavor.objects.create(name="Dolphin Daiquiri Energy", category=self.cat)
        
    def test_basic_merge(self):
        # User 1 rates 'remove'
        r1 = Rating.objects.create(user=self.user1, flavor=self.remove, score=8, comment="Good!")
        
        merge_flavors(self.keep, self.remove)
        
        self.assertFalse(Flavor.objects.filter(id=self.remove.id).exists())
        r1.refresh_from_db()
        self.assertEqual(r1.flavor, self.keep)
        
    def test_merge_with_conflict_keeps_longest_comment(self):
        # User 1 rates both
        r_short = Rating.objects.create(user=self.user1, flavor=self.keep, score=5, comment="Short")
        r_long = Rating.objects.create(user=self.user1, flavor=self.remove, score=9, comment="Very long and detailed review")
        
        # Add a reply to the one being deleted
        reply = Reply.objects.create(user=self.user2, rating=r_long, text="Nice review!")
        
        merge_flavors(self.keep, self.remove)
        
        self.assertEqual(Rating.objects.filter(user=self.user1, flavor=self.keep).count(), 1)
        kept_rating = Rating.objects.get(user=self.user1, flavor=self.keep)
        self.assertEqual(kept_rating.comment, "Very long and detailed review")
        self.assertEqual(kept_rating.score, 9)
        
        # Verify reply moved
        reply.refresh_from_db()
        self.assertEqual(reply.rating, kept_rating)

    def test_merge_with_conflict_preserves_replies_from_discarded(self):
        r_keep = Rating.objects.create(user=self.user1, flavor=self.keep, score=10, comment="Best ever!")
        r_remove = Rating.objects.create(user=self.user1, flavor=self.remove, score=8, comment="Meh")
        
        reply_on_remove = Reply.objects.create(user=self.user2, rating=r_remove, text="I disagree")
        
        merge_flavors(self.keep, self.remove)
        
        kept_rating = Rating.objects.get(user=self.user1, flavor=self.keep)
        self.assertEqual(kept_rating.comment, "Best ever!")
        
        reply_on_remove.refresh_from_db()
        self.assertEqual(reply_on_remove.rating, kept_rating)

class CleanupDuplicatesTests(TestCase):
    def setUp(self):
        self.cat = Category.objects.create(name="Energy", slug="energy")
        self.other_cat = Category.objects.create(name="Iced Tea", slug="iced-tea")
        
    def test_normalization_logic(self):
        f1 = Flavor.objects.create(name="Dolphin Daiquiri", category=self.cat)
        f2 = Flavor.objects.create(name="Dolphin Daiquiri Energy", category=self.cat)
        f3 = Flavor.objects.create(name="Dolphin Daiquiri", category=self.other_cat)
        
        out = StringIO()
        cmd = Command()
        cmd.stdout = out
        cmd.handle()
        
        self.assertTrue(Flavor.objects.filter(id=f1.id).exists())
        self.assertFalse(Flavor.objects.filter(id=f2.id).exists())
        self.assertTrue(Flavor.objects.filter(id=f3.id).exists()) # Different category
        
    def test_various_suffixes(self):
        Flavor.objects.create(name="Berry", category=self.cat)
        Flavor.objects.create(name="Berry Energy", category=self.cat)
        Flavor.objects.create(name="Berry Hydration", category=self.cat)
        Flavor.objects.create(name="Berry Iced Tea", category=self.cat)
        Flavor.objects.create(name="Berry (Legacy)", category=self.cat)
        
        cmd = Command()
        cmd.stdout = StringIO()
        cmd.handle()
        
        self.assertEqual(Flavor.objects.filter(category=self.cat).count(), 1)
