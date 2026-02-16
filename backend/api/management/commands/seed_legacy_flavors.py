import json
import urllib.request
import re
from django.core.management.base import BaseCommand
from api.models import Category, Flavor

class Command(BaseCommand):
    help = 'Adds legacy flavors that are no longer in the official API'

    def handle(self, *args, **options):
        # Ensure categories exist
        energy = Category.objects.get(slug='energy')
        hydration = Category.objects.get(slug='hydration')
        iced_tea = Category.objects.get(slug='iced-tea')

        legacy_data = [
            # Hitschies Collab
            {
                'name': 'Hitschies Drachenzunge (Blue Raspberry)',
                'category': energy,
                'description': 'The legendary sour blue raspberry flavor from the Hitschies collaboration.',
                'image_url': 'https://weareholy.com/cdn/shop/files/Holy_Energy_Hitschies_Sour_Dragon_Tongue_Tub_720x.png',
            },
            {
                'name': 'Hitschies Apple Alligator',
                'category': energy,
                'description': 'Sour apple flavor from the Hitschies collaboration.',
                'image_url': 'https://weareholy.com/cdn/shop/files/Holy_Energy_Hitschies_Apple_Alligator_Tub_720x.png',
            },
            {
                'name': 'Hitschies Fruity Frog',
                'category': energy,
                'description': 'Peach and raspberry mix from the Hitschies collaboration.',
                'image_url': 'https://weareholy.com/cdn/shop/files/Holy_Energy_Hitschies_Fruity_Frog_Tub_720x.png',
            },
            # Holydays 2024
            {
                'name': 'Dolphin Daiquiri',
                'category': energy,
                'description': 'Strawberry and lime cocktail flavor from Holydays 2024.',
                'image_url': 'https://weareholy.com/cdn/shop/files/HOLY_Energy_Holydays_Cocktail_Daiquiri_Dolphin_Tub_720x.png',
            },
            {
                'name': 'Crab Caipirinha',
                'category': energy,
                'description': 'Lime and cane sugar cocktail flavor from Holydays 2024.',
                'image_url': 'https://weareholy.com/cdn/shop/files/HOLY_Energy_Holydays_Cocktail_Caipirinha_Crab_Tub_720x.png',
            },
            {
                'name': 'Makau Mojito',
                'category': energy,
                'description': 'Lime and mint cocktail flavor from Holydays 2024.',
                'image_url': 'https://weareholy.com/cdn/shop/files/HOLY_Energy_Holydays_Cocktail_Mojito_Makau_Tub_720x.png',
            },
            # Others
            {
                'name': 'Frosty Fox (Eisbonbon)',
                'category': energy,
                'description': 'Limited ice candy flavor released for Black Week 2024.',
                'image_url': 'https://weareholy.com/cdn/shop/files/HOLY_Energy_Frosty_Fox_Tub_720x.png',
            },
            {
                'name': 'Bubblegum Butterfly',
                'category': energy,
                'description': 'A classic pink bubblegum flavor that occasionally returns as a limited edition.',
                'image_url': 'https://weareholy.com/cdn/shop/files/HOLY_Energy_Bubblegum_Butterfly_Tub_720x.png',
            },
            {
                'name': 'Knossi Edition Drachenfrucht',
                'category': hydration,
                'description': 'Special Dragonfruit flavor in collaboration with Knossi.',
                'image_url': 'https://weareholy.com/cdn/shop/files/HOLY_Hydration_Knossi_Edition_Tub_720x.png',
            }
        ]

        for data in legacy_data:
            flavor, created = Flavor.objects.update_or_create(
                name=data['name'],
                defaults={
                    'category': data['category'],
                    'description': data['description'],
                    'image_url': data['image_url'],
                    'is_available': False,
                    'external_id': None 
                }
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"Added legacy flavor: {data['name']}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Updated legacy flavor: {data['name']}"))
