import { storiesOf as of } from '@storybook/react'
import { withInfo } from '@storybook/addon-info'

export const storiesOf = (name: string, m: NodeModule) => {
  const stories = of(name, m)
  stories.addDecorator(withInfo)

  // Hack to make hooks work with storybook. Real fix available in https://github.com/storybookjs/storybook/releases/tag/v5.2.0-beta.10
  stories.addDecorator((Story: any) => <Story />)

  return stories
}
