import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

export interface ScrapedContent {
  metaTitle: string;
  metaDescription: string;
  headings: { level: number; text: string }[];
  paragraphs: string[];
  images: { src: string; alt: string }[];
  links: { href: string; text: string; internal: boolean }[];
  structureSummary: string;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  async scrapeUrl(url: string): Promise<ScrapedContent> {
    this.logger.log(`Scraping URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; GADSAudit/1.0; +https://gads.karalisdemo.it)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script, style, and nav elements
    $('script, style, noscript, iframe, svg').remove();

    const baseUrl = new URL(url).origin;

    // Meta
    const metaTitle = $('title').text().trim() || '';
    const metaDescription =
      $('meta[name="description"]').attr('content')?.trim() || '';

    // Headings
    const headings: { level: number; text: string }[] = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        headings.push({
          level: parseInt(el.tagName.replace('h', ''), 10),
          text: text.substring(0, 300),
        });
      }
    });

    // Paragraphs (meaningful text only)
    const paragraphs: string[] = [];
    $('p, li').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20) {
        paragraphs.push(text.substring(0, 500));
      }
    });
    // Keep max 30 paragraphs to avoid huge payloads
    const trimmedParagraphs = paragraphs.slice(0, 30);

    // Images
    const images: { src: string; alt: string }[] = [];
    $('img').each((_, el) => {
      const src = $(el).attr('src') || '';
      const alt = $(el).attr('alt') || '';
      if (src && !src.startsWith('data:')) {
        images.push({
          src: src.startsWith('http') ? src : `${baseUrl}${src}`,
          alt: alt.substring(0, 200),
        });
      }
    });

    // Links
    const links: { href: string; text: string; internal: boolean }[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      if (href && text && !href.startsWith('#') && !href.startsWith('javascript:')) {
        const isInternal =
          href.startsWith('/') || href.startsWith(baseUrl);
        links.push({
          href: href.startsWith('http') ? href : `${baseUrl}${href}`,
          text: text.substring(0, 200),
          internal: isInternal,
        });
      }
    });

    // Structure summary
    const sections: string[] = [];
    $('header, nav, main, section, article, aside, footer').each((_, el) => {
      const tag = el.tagName;
      const id = $(el).attr('id') || '';
      const cls = $(el).attr('class')?.split(' ').slice(0, 3).join(' ') || '';
      sections.push(`<${tag}${id ? ` id="${id}"` : ''}${cls ? ` class="${cls}"` : ''}>`);
    });

    const structureSummary = sections.length > 0
      ? `Struttura HTML: ${sections.join(', ')}`
      : 'Nessun elemento semantico rilevato';

    this.logger.log(
      `Scraped ${url}: ${headings.length} headings, ${trimmedParagraphs.length} paragraphs, ${images.length} images`,
    );

    return {
      metaTitle,
      metaDescription,
      headings,
      paragraphs: trimmedParagraphs,
      images: images.slice(0, 20),
      links: links.slice(0, 30),
      structureSummary,
    };
  }
}
