from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField
from accounts.models import Group


class TestSet(models.Model):
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')
    tests = models.JSONField(default=list)
    is_private = models.BooleanField(default=False, help_text="If true, only selected users and groups can access this test.")
    assigned_users = models.ManyToManyField(User, blank=True, related_name='assigned_tests', help_text="Users who are allowed to take this test if private.")
    allowed_groups = models.ManyToManyField('accounts.Group', blank=True, related_name='group_tests', help_text="Groups that are allowed to access this test.")
    start_time = models.DateTimeField(blank=True, null=True, help_text="When the test becomes available.")
    end_time = models.DateTimeField(blank=True, null=True, help_text="When the test closes.")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tests', help_text="The teacher or user who created this test.")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({'Private' if self.is_private else 'Public'})"


class CodingChallenge(models.Model):
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(help_text="Full problem description and constraints.")
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')
    languages = ArrayField(models.CharField(max_length=20), default=list, blank=True)
    test_cases = models.JSONField(default=list, help_text="List of test cases with 'input' and 'expected_output'. Example: [{'input': '2 3', 'expected_output': '5'}]")
    autocheck = models.BooleanField(default=True, help_text="Automatically evaluate solutions.")
    max_score = models.PositiveIntegerField(default=100)
    time_limit = models.FloatField(default=1.0, help_text="Time limit per test case in seconds.")
    memory_limit = models.PositiveIntegerField(default=256, help_text="Memory limit per test in MB.")
    is_private = models.BooleanField(default=False, help_text="If true, only assigned users and groups can access this challenge.")
    assigned_users = models.ManyToManyField(User, blank=True, related_name='coding_challenges')
    allowed_groups = models.ManyToManyField(Group, blank=True, related_name='group_challenges')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_challenges')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        langs = ', '.join(self.languages or [])
        return f"{self.title} ({langs}) - {self.difficulty}"

    def apply_group_rules(self, group: 'ChallengeGroup'):
        """Apply privacy and audience rules from a ChallengeGroup to this challenge."""
        if not group:
            return self
        # Grouped challenges must be private
        self.is_private = True
        self.save(update_fields=['is_private'])
        # Merge audience
        if group.assigned_users.exists():
            self.assigned_users.add(*group.assigned_users.all())
        if group.allowed_groups.exists():
            self.allowed_groups.add(*group.allowed_groups.all())
        return self


class ChallengeGroup(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_challenge_groups')
    challenges = models.ManyToManyField('CodingChallenge', blank=True, related_name='groups')
    start_time = models.DateTimeField(blank=True, null=True)
    end_time = models.DateTimeField(blank=True, null=True)
    is_private = models.BooleanField(default=True)
    assigned_users = models.ManyToManyField(User, blank=True, related_name='assigned_challenge_groups')
    allowed_groups = models.ManyToManyField(Group, blank=True, related_name='allowed_challenge_groups')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def apply_group_rules(self, challenge: 'CodingChallenge' = None):
        """
        Inherit privacy and audience from this group to its challenges.
        - is_private from group
        - union assigned_users and allowed_groups
        - optionally inherit start/end window if set on group
        """
        targets = [challenge] if challenge is not None else list(self.challenges.all())
        for ch in targets:
            ch.apply_group_rules(self)


class CodeSubmission(models.Model):
    challenge = models.ForeignKey(CodingChallenge, on_delete=models.CASCADE, related_name="submissions")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="code_submissions")
    code = models.JSONField(default=dict)
    test_results = models.JSONField(default=list)
    score = models.FloatField(default=0.0)
    passed_count = models.PositiveIntegerField(default=0)
    total_tests = models.PositiveIntegerField(default=0)
    submitted_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("user", "challenge")
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.user.username} → {self.challenge.title} ({self.score})"


class TestSubmission(models.Model):
    test = models.ForeignKey(TestSet, related_name="submissions", on_delete=models.CASCADE)
    user = models.ForeignKey(User, related_name="test_submissions", on_delete=models.CASCADE)
    answers = models.JSONField(default=list)
    correct_count = models.PositiveIntegerField(default=0)
    wrong_count = models.PositiveIntegerField(default=0)
    score = models.FloatField(default=0.0)
    submitted_at = models.DateTimeField(default=timezone.now)
    meta = models.JSONField(default=dict, blank=True, null=True)  # For any additional metadata
    
    def save(self, *args, **kwargs):
        # Ensure meta is always a dictionary, not None
        if self.meta is None:
            self.meta = {}
        super().save(*args, **kwargs)

    class Meta:
        ordering = ["-submitted_at"]
        unique_together = ("user", "test")

    def __str__(self):
        return f"{self.user.username} → {self.test.title} ({self.score})"

    def evaluate(self):
        """
        Evaluate answers against TestSet.tests JSON.
        Expected each test item to include 'correct' index for the correct option.
        answers format: [{"question_index": i, "selected": j}, ...]
        Updates correct_count, wrong_count, and score (0-100).
        """
        tests_def = self.test.tests or []
        selected_map = {}
        for item in (self.answers or []):
            try:
                qidx = int(item.get('question_index'))
                selected_map[qidx] = item.get('selected')
            except Exception:
                continue

        correct = 0
        total = len(tests_def)
        for i, t in enumerate(tests_def):
            correct_idx = None
            if isinstance(t, dict):
                correct_idx = t.get('correct')
            if correct_idx is None:
                # cannot evaluate this question; skip counting
                total = total - 1 if total > 0 else 0
                continue
            if i in selected_map and selected_map[i] == correct_idx:
                correct += 1

        wrong = 0
        if total > 0:
            wrong = max(total - correct, 0)
            score = (correct / total) * 100.0
        else:
            score = 0.0

        self.correct_count = correct
        self.wrong_count = wrong
        self.score = score
        return self
