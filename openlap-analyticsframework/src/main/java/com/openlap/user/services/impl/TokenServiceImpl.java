package com.openlap.user.services.impl;

import static org.springframework.http.HttpHeaders.AUTHORIZATION;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.entities.User;
import com.openlap.user.repositories.UserRepository;
import com.openlap.user.services.TokenService;
import javax.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TokenServiceImpl implements TokenService {
  @Value("${server.token}")
  private String jwtToken;

  private final UserRepository userRepository;

  @Override
  public TokenRequest verifyToken(HttpServletRequest request) {
    String authorizationHeader = request.getHeader(AUTHORIZATION);
    String token = authorizationHeader.substring("Bearer ".length());
    Algorithm algorithm = Algorithm.HMAC256(jwtToken.getBytes());
    JWTVerifier verifier = JWT.require(algorithm).build();
    DecodedJWT decodedJWT = verifier.verify(token);
    String userEmail = decodedJWT.getSubject();
    String[] roles = decodedJWT.getClaim("roles").asArray(String.class);
    return new TokenRequest(userEmail, roles, token, algorithm);
  }

  @Override
  public User getUserFromToken(HttpServletRequest request) {
    TokenRequest tokenRequest = verifyToken(request);
    return userRepository.findByEmail(tokenRequest.getUserEmail());
  }
}
