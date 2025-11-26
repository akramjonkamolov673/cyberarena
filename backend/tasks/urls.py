from django.urls import path

from .views import run_code

app_name = 'tasks'

urlpatterns = [
    path('runner/', run_code, name='run_code'),
]

