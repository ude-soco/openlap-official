package com.openlap.user.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import javax.validation.Constraint;
import javax.validation.Payload;

/**
 * Enforces the OpenLAP password policy. See {@link PasswordValidator} for the rules. Null/blank
 * values are skipped here so they can be reported by {@code @NotBlank}.
 */
@Constraint(validatedBy = PasswordValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidPassword {
  String message() default "Password does not meet the requirements";

  Class<?>[] groups() default {};

  Class<? extends Payload>[] payload() default {};
}
