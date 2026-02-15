import { serialize } from 'next-mdx-remote/serialize'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import type { MDXRemoteSerializeResult } from 'next-mdx-remote'

/**
 * Serializa contenido MDX para renderizado
 */
export async function serializeMDX(
  content: string
): Promise<MDXRemoteSerializeResult> {
  const mdxSource = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'wrap',
            properties: {
              className: ['anchor-link']
            }
          }
        ]
      ],
      format: 'mdx'
    },
    parseFrontmatter: false // Ya lo parseamos con gray-matter
  })

  return mdxSource
}
