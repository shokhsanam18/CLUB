# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# How to set up the backend
```
To set up a virtual env:
python -m venv venv
venv/scripts/activate
pip install -r requirements.txt

To run django server:
cd club_backend
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```
copy the key and paste it into your env file, then
```
python manage.py migrate # to setup database
python setup_permissions.py # apply permissions 
python manage.py createsuperuser # make a superuser 
python manage.py runserver
```

# env
```
DJANGO_SECRET_KEY=your-django-key
ALLOWED_HOSTS=127.0.0.1,localhost
DEBUG=True

CSRF_TRUSTED_ORIGINS=your-adrresses
CORS_ALLOWED_ORIGINS=your-adrresses
```
