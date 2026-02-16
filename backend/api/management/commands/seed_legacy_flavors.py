from django.core.management.base import BaseCommand
from api.models import Category, Flavor

class Command(BaseCommand):
    help = 'Adds legacy flavors that are no longer in the official API or are old versions'

    def handle(self, *args, **options):
        # Ensure categories exist
        energy = Category.objects.get(slug='energy')
        hydration = Category.objects.get(slug='hydration')
        iced_tea = Category.objects.get(slug='iced-tea')

        legacy_data = [
            {
                "Name": "Hitschies Saure Drachenzunge (Legacy)",
                "Geschmack": "Blaue Himbeere",
                "Beschreibung": "Eine legendäre Kollaboration mit Hitschies. Schmeckt wie die blauen sauren Drachenzungen – süß, fruchtig und sauer.",
                "Status": "Limited Edition / Vaulted",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/Holy_Energy_Hitschies_Sour_Dragon_Tongue_Tub_720x.png"
            },
            {
                "Name": "Hitschies Saure Drachenzunge Rot (Legacy)",
                "Geschmack": "Erdbeere & Kirsche",
                "Beschreibung": "Die rote Variante der Hitschies-Kollaboration. Fruchtiger Mix aus roten Beeren, angelehnt an die roten Drachenzungen.",
                "Status": "Limited Edition",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/Holy_Energy_Hitschies_Sour_Dragon_Tongue_Red_Tub_720x.png"
            },
            {
                "Name": "Lion's Lemonade (Legacy)",
                "Geschmack": "Mango & Kiwi",
                "Beschreibung": "Einer der beliebtesten Klassiker. Ein tropischer, fruchtiger Mix für maximalen Fokus. Oft von Fans zurückgefordert.",
                "Status": "Vaulted",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/HOLY_Energy_Lions_Lemonade_Tub_720x.png"
            },
            {
                "Name": "Lollipop Lovebird (Legacy)",
                "Geschmack": "Kirsch-Lolli",
                "Beschreibung": "Erinnert an die klassischen roten Kirsch-Lollies aus der Kindheit. Sehr süß und intensiv.",
                "Status": "Limited Edition",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/HOLY_Energy_Lollipop_Lovebird_Tub_720x.png"
            },
            {
                "Name": "Frosty Fox (Legacy)",
                "Geschmack": "Eisbonbon",
                "Beschreibung": "Ein kühler, süßer Geschmack, der an die klassischen Eisbonbons erinnert. Erfrischend mit einer 'kühlen' Note.",
                "Status": "Limited Edition",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/HOLY_Energy_Frosty_Fox_Tub_720x.png"
            },
            {
                "Name": "Bubble Gum Butterfly (Legacy)",
                "Geschmack": "Kaugummi",
                "Beschreibung": "Der typische rosa Kaugummi-Geschmack (Bubblegum). Sehr süß und nostalgisch.",
                "Status": "Limited Edition",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/HOLY_Energy_Bubblegum_Butterfly_Tub_720x.png"
            },
            {
                "Name": "Woodruff Wolf (Legacy)",
                "Geschmack": "Waldmeister",
                "Beschreibung": "Ein traditioneller deutscher Geschmack. Süß-würzig, wie Wackelpudding oder Waldmeister-Sirup.",
                "Status": "Limited Edition",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/HOLY_Energy_Woodruff_Wolf_Tub_720x.png"
            },
            {
                "Name": "Baked Apple Boar (Legacy)",
                "Geschmack": "Bratapfel",
                "Beschreibung": "Eine winterliche Sonderedition mit warmen Noten von Apfel und Zimt.",
                "Status": "Seasonal / Vaulted",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/HOLY_Energy_Baked_Apple_Boar_Tub_720x.png"
            },
            {
                "Name": "Kölle Kamelle (Legacy)",
                "Geschmack": "Fruchtbonbons (Karnevalsmischung)",
                "Beschreibung": "Spezialedition zum Kölner Karneval. Schmeckt nach einem Mix aus verschiedenen Fruchtbonbons ('Kamelle').",
                "Status": "Limited Edition",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/HOLY_Energy_Koelle_Kamelle_Tub_720x.png"
            },
            {
                "Name": "Strawberry Shark (Legacy)",
                "Geschmack": "Erdbeere & Mandarine",
                "Beschreibung": "Ein fruchtiger Mix aus süßer Erdbeere und spritziger Mandarine. Teil des ursprünglichen 'Squads'.",
                "Status": "Discontinued",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/HOLY_Energy_Strawberry_Shark_Tub_720x.png"
            },
            {
                "Name": "Blueberry Bear (Legacy)",
                "Geschmack": "Blaubeere & Kokosnuss",
                "Beschreibung": "Eine weiche Beeren-Note mit einem exotischen Kokos-Abgang.",
                "Status": "Discontinued",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/HOLY_Energy_Blueberry_Bear_Tub_720x.png"
            },
            {
                "Name": "Thai Lime Toucan (Legacy)",
                "Geschmack": "Kaffir-Limette",
                "Beschreibung": "Sehr aromatisch und zesty. Unterscheidet sich von normaler Zitrone durch die herbe Kaffir-Note.",
                "Status": "Discontinued",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/HOLY_Energy_Thai_Lime_Toucan_Tub_720x.png"
            },
            {
                "Name": "Cactus Camel (Legacy)",
                "Geschmack": "Kaktusfeige",
                "Beschreibung": "Erfrischend, leicht melonenartig und nicht zu süß. Ein sehr eigener, beliebter Geschmack.",
                "Status": "Discontinued",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/HOLY_Energy_Cactus_Camel_Tub_720x.png"
            },
            {
                "Name": "Apple Alligator (Legacy)",
                "Geschmack": "Grüner Apfel",
                "Beschreibung": "Knackiger, saurer Apfelgeschmack. Sehr erfrischend.",
                "Status": "Discontinued",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/HOLY_Energy_Apple_Alligator_Tub_720x.png"
            },
            {
                "Name": "Cherry Cheetah (Legacy)",
                "Geschmack": "Kirsche",
                "Beschreibung": "Klassischer, fruchtiger Kirschgeschmack.",
                "Status": "Discontinued",
                "Bild_URL": "https://weareholy.com/cdn/shop/files/HOLY_Energy_Cherry_Cheetah_Tub_720x.png"
            }
        ]

        for data in legacy_data:
            full_description = f"**Geschmack:** {data['Geschmack']}\n\n{data['Beschreibung']}\n\n**Status:** {data['Status']}"
            
            cat = energy # Default
            if "hydration" in data['Name'].lower() or "hydration" in data['Beschreibung'].lower():
                cat = hydration
            elif "iced tea" in data['Name'].lower() or "eistee" in data['Name'].lower():
                cat = iced_tea

            flavor, created = Flavor.objects.update_or_create(
                name=data['Name'],
                defaults={
                    'category': cat,
                    'description': full_description,
                    'image_url': data['Bild_URL'],
                    'is_available': False,
                    'external_id': None 
                }
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"Added legacy flavor: {data['Name']}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Updated legacy flavor: {data['Name']}"))
