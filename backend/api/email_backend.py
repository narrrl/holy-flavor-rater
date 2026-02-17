import ssl
from django.core.mail.backends.smtp import EmailBackend
from django.conf import settings

class InsecureEmailBackend(EmailBackend):
    """
    SMTP email backend that allows skipping SSL certificate verification.
    Useful for local development or internal SMTP servers with self-signed certificates.
    Set EMAIL_SKIP_CERT_VERIFICATION = True in settings to use.
    """
    @property
    def ssl_context(self):
        if getattr(settings, 'EMAIL_SKIP_CERT_VERIFICATION', False):
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            return context
        return super().ssl_context
