package com.openlap.content;

import com.openlap.response.ApiSuccess;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/content")
@RequiredArgsConstructor
public class PublicContentController {
  private final ContentService contentService;

  @GetMapping("/{kind}")
  public ApiSuccess list(@PathVariable String kind,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "6") int size) {
    return new ApiSuccess(HttpStatus.OK, "Content found.", contentService.published(ContentKind.from(kind), page, size));
  }
}
