import {test,expect} from 'bun:test';
import {externalLinks} from '../src/search/external-links.ts';

test('external links include markdown, reference, automatic and bare URLs with balanced parentheses',()=>{
  const text='[Example](https://example.com/wiki/Foo_(bar))\n[ref]: https://docs.example.com/guide\n<https://auto.example.com>\nSee https://bare.example.com/test.\nhttps://bare.example.com/test';
  expect(externalLinks(text)).toEqual(['https://example.com/wiki/Foo_(bar)','https://docs.example.com/guide','https://auto.example.com','https://bare.example.com/test']);
});
test('external links omit inline code, fenced code and comments',()=>{
  const text='`https://inline.example.com`\n```md\nhttps://fenced.example.com\n```\n~~~\nhttps://tilde.example.com\n~~~\n<!-- https://comment.example.com -->\n[visible](https://visible.example.com)';
  expect(externalLinks(text)).toEqual(['https://visible.example.com']);
});
