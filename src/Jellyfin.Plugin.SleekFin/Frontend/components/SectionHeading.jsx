import { Fragment, h } from 'preact';

export function SectionHeading({ title, subtitle, contentsOnly }) {
  const contents = (
    <Fragment>
      <span class="dinkflix-section-rail" />
      <div class="dinkflix-section-copy">
        {typeof title === 'string' ? <h2 class="dinkflix-section-title">{title}</h2> : title}
        {subtitle && (typeof subtitle === 'string' ? <p class="dinkflix-section-subtitle">{subtitle}</p> : subtitle)}
      </div>
    </Fragment>
  );

  return contentsOnly ? contents : <div class="dinkflix-section-heading">{contents}</div>;
}
