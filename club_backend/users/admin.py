from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser
# Register your models here.

class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'password', 'role', 'university')
    list_filter = ('university', 'groups', 'is_active')
    search_fields = ('first_name', 'last_name')
    
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('university', 'bio', 'avatar', 'club', 'joined_club_at', 'is_profile_public')
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superadmin():
            return qs
        elif request.user.is_ambassador():
            # Ambassadors can only see users from their university
            return qs.filter(university=request.user.university)
        return qs.none()
    
admin.site.register(CustomUser, CustomUserAdmin)

