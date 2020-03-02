//@ts-ignore Remove once addon-info or addon-docs is migrated to typescript https://github.com/storybookjs/storybook/issues/5030
import { withInfo } from '@storybook/addon-info'
import { storiesOf as of } from '@storybook/react'
import * as React from 'react'

export const storiesOf = (name: string, m: NodeModule) => {
  const stories = of(name, m)
  stories.addDecorator(withInfo as any)

  // Hack to make hooks work with storybook. Real fix available in https://github.com/storybookjs/storybook/releases/tag/v5.2.0-beta.10
  stories.addDecorator((Story: any) => <Story />)

  return stories
}
