import { storiesOf as of } from '@storybook/react'

export const storiesOf = (name: string, m: NodeModule) => {
  const stories = of(name, m)
  return stories
}
