package com.aix.team03.auth;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

/** Uses real RSA signatures and a local JWKS endpoint, with no real Google credentials. */
class GoogleTokenVerifierTests {
    static final String CLIENT = "fixture.apps.googleusercontent.com";
    RSAKey key;
    HttpServer server;
    GoogleTokenVerifier verifier;

    @BeforeEach
    void setUp() throws Exception {
        key = new RSAKeyGenerator(2048).keyID("fixture-key").generate();
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/certs", exchange -> {
            byte[] body = new JWKSet(key.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        verifier = new GoogleTokenVerifier(CLIENT, GoogleTokenVerifier.createDecoder(CLIENT,
                "http://127.0.0.1:" + server.getAddress().getPort() + "/certs"));
    }

    @AfterEach
    void stop() { server.stop(0); }

    JWTClaimsSet.Builder claims() {
        return new JWTClaimsSet.Builder().issuer("https://accounts.google.com").audience(CLIENT)
                .subject("google-sub-7").issueTime(Date.from(Instant.now()))
                .expirationTime(Date.from(Instant.now().plusSeconds(3600)))
                .claim("email", "student@example.test").claim("email_verified", true).claim("nonce", "session-nonce");
    }

    String token(JWTClaimsSet.Builder claims, RSAKey signingKey) throws Exception {
        var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256)
                .keyID("fixture-key").type(JOSEObjectType.JWT).build(), claims.build());
        jwt.sign(new RSASSASigner(signingKey));
        return jwt.serialize();
    }

    @Test
    void acceptsSignedGoogleIdentityForThisClientAndNonce() throws Exception {
        assertThat(verifier.verify(token(claims(), key), "session-nonce"))
                .isEqualTo(new AuthUser("google-sub-7", "student@example.test"));
        assertThat(verifier.verify(token(claims().issuer("accounts.google.com"), key), "session-nonce").id())
                .isEqualTo("google-sub-7");
    }

    @Test
    void rejectsWrongIssuerAudienceExpiryNonceAndUnverifiedEmail() throws Exception {
        for (var invalid : new JWTClaimsSet.Builder[] {
                claims().issuer("https://attacker.example"), claims().audience("other-client"),
                claims().expirationTime(Date.from(Instant.now().minusSeconds(120))),
                claims().expirationTime(null), claims().claim("nonce", "other-session"),
                claims().claim("email_verified", false), claims().subject(null),
                claims().claim("azp", "other-client")}) {
            String credential = token(invalid, key);
            assertThatThrownBy(() -> verifier.verify(credential, "session-nonce"))
                    .isInstanceOfSatisfying(AuthException.class,
                            error -> assertThat(error.getCode()).isEqualTo("AUTH_INVALID_CREDENTIAL"));
        }
    }

    @Test
    void rejectsForgedAndMalformedTokens() throws Exception {
        var attacker = new RSAKeyGenerator(2048).generate();
        String forged = token(claims(), attacker);
        assertThatThrownBy(() -> verifier.verify(forged, "session-nonce"))
                .isInstanceOf(AuthException.class);
        assertThatThrownBy(() -> verifier.verify("not-a-jwt", "session-nonce"))
                .isInstanceOf(AuthException.class);
    }

    @Test
    void noClientIdFailsClosed() {
        var unconfigured = new GoogleTokenVerifier("");
        assertThatThrownBy(() -> unconfigured.verify("anything", "nonce"))
                .isInstanceOfSatisfying(AuthException.class,
                        error -> assertThat(error.getCode()).isEqualTo("AUTH_NOT_CONFIGURED"));
    }
}
