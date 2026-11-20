import { describe, expect, it } from 'vitest';
import { datesFromPage, githubRepo, linkedinDay, toDay } from '../../api/_published';

describe('toDay', () => {
  it('keeps the day a timestamp was written in', () => {
    expect(toDay('2025-04-01T06:31:51-07:00')).toBe('2025-04-01');
    expect(toDay('2026-11-15T16:48:18.060Z')).toBe('2026-11-15');
    expect(toDay('2026-07-27')).toBe('2026-07-27');
  });

  it('reads a written-out date', () => {
    expect(toDay('April 9, 2022')).toBe('2022-04-09');
  });

  it('refuses things that are not dates', () => {
    expect(toDay('formatTime(currentTime)')).toBeNull();
    expect(toDay('')).toBeNull();
    expect(toDay(undefined)).toBeNull();
  });
});

describe('linkedinDay', () => {
  it('reads the date out of a post number', () => {
    expect(linkedinDay('https://www.linkedin.com/posts/ugcPost-7217072954809974786-B099')).toBe('2024-07-11');
    expect(linkedinDay('https://www.linkedin.com/feed/update/urn:li:activity:7254467327264497664/')).toBe(
      '2024-10-22',
    );
  });

  it('finds nothing in a link without a post number', () => {
    expect(linkedinDay('https://www.linkedin.com/pulse/some-article-title')).toBeNull();
  });
});

describe('datesFromPage', () => {
  it('reads a blog article date, and an updated date only when it differs', () => {
    const html = `<meta property="article:published_time" content="2024-10-26T14:11:11+00:00">
      <meta property="article:modified_time" content="2025-01-03T09:00:00+00:00">`;
    expect(datesFromPage('https://example.com/a', html)).toEqual({ published: '2024-10-26', updated: '2025-01-03' });

    const same = `<meta property="article:published_time" content="2024-10-26T14:11:11+00:00">
      <meta property="article:modified_time" content="2024-10-26T18:00:00+00:00">`;
    expect(datesFromPage('https://example.com/a', same)).toEqual({ published: '2024-10-26', updated: null });

    const earlier = `<meta property="article:published_time" content="2026-06-15T10:00:00Z">
      <meta content="2026-06-13T10:00:00Z" itemprop="dateModified">
      <script>{"dateModified":"2026-06-13T10:00:00Z"}</script>`;
    expect(datesFromPage('https://example.com/a', earlier)).toEqual({ published: '2026-06-15', updated: null });
  });

  it('reads a YouTube upload date', () => {
    const html = `{"uploadDate":"2022-01-22T14:42:25-08:00"}`;
    expect(datesFromPage('https://www.youtube.com/watch?v=x', html).published).toBe('2022-01-22');
  });

  it('reads a Transistor podcast episode date', () => {
    const html = `data-x="{&quot;published_at&quot;:&quot;April 9, 2022&quot;,&quot;duration&quot;:1868}"`;
    expect(datesFromPage('https://share.transistor.fm/s/6dbaf0a4', html).published).toBe('2022-04-09');
  });

  it('skips a time tag that is not a real date', () => {
    const html = `<time datetime="formatTime(currentTime)"></time>`;
    expect(datesFromPage('https://share.transistor.fm/s/x', html).published).toBeNull();
  });

  it('uses the post number of a LinkedIn short link it was sent on to', () => {
    expect(
      datesFromPage('https://www.linkedin.com/feed/update/urn:li:activity:7254467327264497664/', '<html></html>')
        .published,
    ).toBe('2024-10-22');
  });

  it('says nothing when the page says nothing', () => {
    expect(datesFromPage('https://example.com', '<html><body>hi</body></html>')).toEqual({
      published: null,
      updated: null,
    });
  });
});

describe('githubRepo', () => {
  it('finds the project in a GitHub link', () => {
    expect(githubRepo('https://github.com/ServiceNow/sdk#ai-skills')).toBe('ServiceNow/sdk');
    expect(githubRepo('https://github.com/legato27/sn-ai-debugger/tree/main/src')).toBe('legato27/sn-ai-debugger');
  });

  it('ignores links that are not a GitHub project', () => {
    expect(githubRepo('https://servicenow.github.io/sdk/')).toBeNull();
    expect(githubRepo('https://github.com/ServiceNow')).toBeNull();
  });
});
