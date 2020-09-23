const { configure, addDecorator } = require('@storybook/react')
import { withKnobs } from '@storybook/addon-knobs/react'

addDecorator(withKnobs)

const req = require.context(__STORYBOOK_ROOT__, true, /\.stories\.(j|t)sx?$/)

function loadStories() {
  req.keys().forEach((filename) => req(filename))
}

configure(loadStories, module)
