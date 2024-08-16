package com.openlap.analytics_module.custom_annotators;

import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import javax.validation.ConstraintValidator;
import javax.validation.ConstraintValidatorContext;

public class IndicatorTypeValidator
    implements ConstraintValidator<ValidIndicatorType, IndicatorType> {

  private IndicatorType requiredType;

  @Override
  public void initialize(ValidIndicatorType constraintAnnotation) {
    this.requiredType = constraintAnnotation.value();
  }

  @Override
  public boolean isValid(IndicatorType indicatorType, ConstraintValidatorContext context) {
    return indicatorType == requiredType;
  }
}
