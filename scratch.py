import os
import django
import json
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "docquery_backend.settings")
django.setup()

from documents.views import DocumentListCreateView
from django.test import RequestFactory
from django.contrib.auth.models import User

user, _ = User.objects.get_or_create(username='test')
request = RequestFactory().get('/api/documents/')
request.user = user

view = DocumentListCreateView.as_view()
response = view(request)
response.render()
print(response.content.decode('utf-8'))
