import { render } from 'preact';
import '@fontsource-variable/dm-sans';
import './styles.css';
import { App } from './app';
import { registerSW } from './push';

registerSW();
render(<App />, document.getElementById('app')!);
