import React from 'react';

interface LinkifiedTextProps {
  text?: string | null;
  as?: 'span' | 'p' | 'div';
  className?: string;
  linkClassName?: string;
}

const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING_PUNCTUATION_PATTERN = /[),.;:!?]+$/;

const normalizeHref = (url: string) => (url.toLowerCase().startsWith('www.') ? `https://${url}` : url);

const splitTrailingPunctuation = (url: string) => {
  const trailingMatch = url.match(TRAILING_PUNCTUATION_PATTERN);
  const trailing = trailingMatch?.[0] ?? '';
  const cleanUrl = trailing ? url.slice(0, -trailing.length) : url;

  return { cleanUrl, trailing };
};

const LinkifiedText = ({
  text,
  as: Component = 'span',
  className = '',
  linkClassName = '',
}: LinkifiedTextProps) => {
  const content = String(text ?? '');

  if (!content) {
    return null;
  }

  const parts = content.split(URL_PATTERN);

  return (
    <Component className={`whitespace-pre-line break-words ${className}`}>
      {parts.map((part, index) => {
        if (!part.match(URL_PATTERN)) {
          return <React.Fragment key={`${index}-text`}>{part}</React.Fragment>;
        }

        const { cleanUrl, trailing } = splitTrailingPunctuation(part);
        if (!cleanUrl) {
          return <React.Fragment key={`${index}-empty`}>{part}</React.Fragment>;
        }

        return (
          <React.Fragment key={`${index}-${cleanUrl}`}>
            <a
              href={normalizeHref(cleanUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className={`break-all font-semibold text-[#0F8F61] underline decoration-[#0F8F61]/35 underline-offset-4 transition-colors hover:text-[#0C7A52] hover:decoration-[#0C7A52] ${linkClassName}`}
            >
              {cleanUrl}
            </a>
            {trailing}
          </React.Fragment>
        );
      })}
    </Component>
  );
};

export default LinkifiedText;
