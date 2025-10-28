from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import UserProfile


class Command(BaseCommand):
    help = 'Test foydalanuvchilarni yaratish'

    def handle(self, *args, **kwargs):
        # Student yaratish
        if not User.objects.filter(username='student1').exists():
            user1 = User.objects.create_user(
                username='student1',
                email='student@test.com',
                password='test1234'
            )
            UserProfile.objects.create(
                user=user1,
                nickname='Test Student',
                role='student',
                first_name='Ali',
                last_name='Valiyev'
            )
            self.stdout.write(self.style.SUCCESS('✓ Student1 yaratildi (username: student1, password: test1234)'))
        else:
            self.stdout.write(self.style.WARNING('Student1 allaqachon mavjud'))

        # Teacher yaratish
        if not User.objects.filter(username='teacher1').exists():
            user2 = User.objects.create_user(
                username='teacher1',
                email='teacher@test.com',
                password='test1234'
            )
            UserProfile.objects.create(
                user=user2,
                nickname='Test Teacher',
                role='teacher',
                first_name='Vali',
                last_name='Aliyev',
                subject='Informatika'
            )
            self.stdout.write(self.style.SUCCESS('✓ Teacher1 yaratildi (username: teacher1, password: test1234)'))
        else:
            self.stdout.write(self.style.WARNING('Teacher1 allaqachon mavjud'))

        self.stdout.write(self.style.SUCCESS('\n✅ Test foydalanuvchilar tayyor!'))
