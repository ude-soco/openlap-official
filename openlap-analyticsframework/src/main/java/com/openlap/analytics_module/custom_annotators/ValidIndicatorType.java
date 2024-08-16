package com.openlap.analytics_module.custom_annotators;

import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import javax.validation.Constraint;
import javax.validation.Payload;

@Constraint(validatedBy = IndicatorTypeValidator.class)
@Target({ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidIndicatorType {
  IndicatorType value();

  String message() default "Invalid indicator type";

  Class<?>[] groups() default {};

  Class<? extends Payload>[] payload() default {};
}
