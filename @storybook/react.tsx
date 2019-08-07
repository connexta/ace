import { storiesOf as of } from '@storybook/react'
import { withInfo } from '@storybook/addon-info'

export const storiesOf = (name: string, m: NodeModule) => {
  const stories = of(name, m)
  stories.addDecorator(withInfo)
  return stories
}
