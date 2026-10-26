package com.aix.team03.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

@Service
public class GoogleTokenVerifier {
    private final String clientId;
    private final JwtDecoder decoder;

    @Autowired
    public GoogleTokenVerifier(@Value("${app.auth.google-client-id:}") String clientId) {
        this(clientId, createDecoder(clientId, "https://www.googleapis.com/oauth2/v3/certs"));
    }

    GoogleTokenVerifier(String clientId, JwtDecoder decoder) {
        this.clientId = clientId;
        this.decoder = decoder;
    }

    // Fixed Google JWKS in production; injectable URL only for local signed-token tests.
    static NimbusJwtDecoder createDecoder(String clientId, String jwksUri) {
        var decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(), jwt -> {
            String issuer = jwt.getClaimAsString("iss");
            boolean valid = ("https://accounts.google.com".equals(issuer) || "accounts.google.com".equals(issuer))
                    && !clientId.isBlank() && jwt.getAudience() != null && jwt.getAudience().contains(clientId)
                    && (jwt.getClaimAsString("azp") == null || clientId.equals(jwt.getClaimAsString("azp")))
                    && jwt.getExpiresAt() != null;
            return valid ? OAuth2TokenValidatorResult.success() : OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Invalid Google issuer or audience", null));
        }));
        return decoder;
    }

    public String clientId() { return clientId; }

    public AuthUser verify(String credential, String expectedNonce) {
        if (clientId.isBlank()) {
            throw new AuthException("AUTH_NOT_CONFIGURED", "Google 로그인이 아직 설정되지 않았습니다.",
                    HttpStatus.SERVICE_UNAVAILABLE);
        }
        try {
            var jwt = decoder.decode(credential);
            String nonce = jwt.getClaimAsString("nonce");
            String email = jwt.getClaimAsString("email");
            if (jwt.getSubject() == null || jwt.getSubject().isBlank()
                    || email == null || email.isBlank() || !Boolean.TRUE.equals(jwt.getClaim("email_verified"))
                    || nonce == null || expectedNonce == null
                    || !MessageDigest.isEqual(nonce.getBytes(StandardCharsets.UTF_8),
                            expectedNonce.getBytes(StandardCharsets.UTF_8))) {
                throw invalidCredential();
            }
            return new AuthUser(jwt.getSubject(), email);
        } catch (BadJwtException | IllegalArgumentException exception) {
            throw invalidCredential();
        } catch (JwtException exception) {
            throw new AuthException("AUTH_PROVIDER_UNAVAILABLE", "Google 인증을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
                    HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    private static AuthException invalidCredential() {
        return new AuthException("AUTH_INVALID_CREDENTIAL", "인증이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.",
                HttpStatus.UNAUTHORIZED);
    }
}
