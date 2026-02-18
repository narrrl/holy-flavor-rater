from django.db import migrations

def seed_banners(apps, schema_editor):
    Banner = apps.get_model('api', 'Banner')
    
    # Create the original Generative Web
    Banner.objects.get_or_create(
        slug='generative-web',
        defaults={
            'name': 'Generative Web',
            'description': 'The original complex web interactive banner.',
            'settings': {
                'nodeCountBase': 60,
                'connectionDist': 140,
                'speed': 0.005,
                'opacity': 0.35
            },
            'is_active': False
        }
    )
    
    # Create Matrix Code
    Banner.objects.get_or_create(
        slug='matrix',
        defaults={
            'name': 'Matrix Code',
            'description': 'A matrix-style falling code banner using the username.',
            'settings': {
                'opacity': 0.6
            },
            'is_active': False
        }
    )
    
    # Create Nebula Cloud and set as active
    Banner.objects.get_or_create(
        slug='nebula',
        defaults={
            'name': 'Nebula Cloud',
            'description': 'An interactive space-themed nebular cloud with fluid movement.',
            'settings': {
                'particleCount': 200,
                'speed': 0.005,
                'opacity': 0.8,
                'attractionForce': 0.2
            },
            'is_active': True
        }
    )

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0023_banner'),
    ]

    operations = [
        migrations.RunPython(seed_banners),
    ]
