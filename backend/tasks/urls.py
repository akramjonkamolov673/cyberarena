from django.urls import path

from .views import run_code, get_my_test_submissions, get_my_code_submissions

app_name = 'tasks'

urlpatterns = [
    path('runner/', run_code, name='run_code'),
    path('my-test-submissions/', get_my_test_submissions, name='my_test_submissions'),
    path('my-code-submissions/', get_my_code_submissions, name='my_code_submissions'),
]

