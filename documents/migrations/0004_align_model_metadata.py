import django.core.validators
from django.db import migrations, models

import documents.models
import pgvector.django


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0003_document_processing_started_at"),
    ]

    operations = [
        migrations.AlterField(
            model_name="chatmessage",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                help_text="UTC timestamp of message creation; used to reconstruct history order.",
            ),
        ),
        migrations.AlterField(
            model_name="chunk",
            name="embedding",
            field=pgvector.django.VectorField(
                dimensions=384,
                help_text="Dense vector of dimension 384, produced by the configured embedding model. Used for cosine similarity retrieval.",
            ),
        ),
        migrations.AlterField(
            model_name="chunk",
            name="token_count",
            field=models.PositiveIntegerField(
                help_text="Approximate token count (tiktoken or model-native). Useful for debugging and future cost estimation with API-based embedders.",
            ),
        ),
        migrations.AlterField(
            model_name="document",
            name="file",
            field=models.FileField(
                help_text="The raw uploaded file (PDF or .txt). Max 20 MB enforced at the API layer.",
                upload_to=documents.models._document_upload_path,
                validators=[
                    django.core.validators.FileExtensionValidator(
                        allowed_extensions=["pdf", "txt"],
                        message="Only PDF and plain-text (.txt) files are accepted in v1.",
                    )
                ],
            ),
        ),
        migrations.AlterField(
            model_name="document",
            name="processing_started_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Timestamp when the background worker claimed this document.",
                null=True,
            ),
        ),
    ]
