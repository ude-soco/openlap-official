package com.openlap.user.services;

import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.entities.User;

import javax.servlet.http.HttpServletRequest;

public interface TokenService {
	TokenRequest verifyToken(HttpServletRequest request);

	User getUserFromToken(HttpServletRequest request);
}
