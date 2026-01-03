# PNG Outline

A Figma plugin that adds high-quality outlines to images with anti-aliased, smooth strokes.

## Features

- **High quality:** High resolution export with supersampling
- **Smart cropping:** Respects current crop position
- **Customizable:** Adjustable stroke width and color
- **Live preview:** See changes in real-time

## Usage

1. Select an image or frame
2. Run the plugin
3. Adjust stroke width and color
4. Click "Generate Outline"

## Development

```bash
# Install dependencies
npm install

# Build
npm run build


Load the plugin in Figma: `Plugins` → `Development` → `Import plugin from manifest...`

## Technical Notes

- Exports at high resolution for clarity
- Uses canvas API for image processing
- Dynamic step calculation prevents jagged edges
- All processing happens locally (no external servers)

## License

MIT
