from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0002_initial_models"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="processing_started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
