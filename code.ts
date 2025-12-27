// Show UI
figma.showUI(__html__, { visible: true, width: 300, height: 400 });

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'request-process') {
    // User clicked "Generate"
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: "Please select an image first." });
      return;
    }

    const node = selection[0];

    // Check if it has fills and is an image
    if (!('fills' in node) || !Array.isArray(node.fills)) {
      figma.ui.postMessage({ type: 'error', message: "Selected layer has no fills." });
      return;
    }

    // Prioritize visible image fills (e.g. ignoring hidden original images after background removal)
    let imageFill = node.fills.find(fill => fill.type === 'IMAGE' && fill.visible !== false);

    // Fallback: If no visible image fill, try any image fill
    if (!imageFill) {
      imageFill = node.fills.find(fill => fill.type === 'IMAGE');
    }

    if (!imageFill) {
      figma.ui.postMessage({ type: 'error', message: "Selected object is not an image." });
      return;
    }

    const image = figma.getImageByHash(imageFill.imageHash);

    if (!image) {
      figma.ui.postMessage({ type: 'error', message: "Could not retrieve image data." });
      return;
    }

    const bytes = await image.getBytesAsync();

    // Send data + options to UI for processing
    figma.ui.postMessage({
      type: 'process-image',
      bytes: bytes,
      width: node.width,
      height: node.height,
      options: msg.options // Pass user options through
    });

  } else if (msg.type === 'image-processed') {
    // UI finished processing
    const { data, options } = msg;
    const newBytes = data;
    const newImage = figma.createImage(newBytes);

    const newRect = figma.createRectangle();
    const originalNode = figma.currentPage.selection[0];

    // Calculate new size based on the scale used
    const { width: pixelWidth, height: pixelHeight } = await newImage.getSizeAsync();

    // Place next to original
    newRect.x = originalNode.x + originalNode.width + 20;
    newRect.y = originalNode.y;

    // Calculate the logical display size:
    // We want to fit the generated image (which matches natural aspect ratio)
    // into the original node's bounding box, but expanded by the stroke.

    // 1. Get aspect ratio of the generated image (which is natural image + stroke)
    const imageRatio = pixelWidth / pixelHeight;

    // 2. Determine the "content" size of the original node (assuming FIT behavior)
    // We need to know how big the image *actually* is inside the node to apply stroke correctly.
    // Since we don't know the exact fit, we'll assume the user wants the result to match
    // the natural aspect ratio of the image, scaled to fit the node's largest dimension.

    let displayWidth, displayHeight;

    // Simple approach: Maintain the generated image's aspect ratio.
    // Scale it so it fits within the original node's box (plus stroke).
    // Actually, simpler: The generated image IS the content.
    // We just need to scale it down so it's roughly the same size as the original node.

    // Let's use the node's width as the anchor if it's wider than tall relative to image, or vice versa.
    // Basically "contain" logic.
    const nodeRatio = originalNode.width / originalNode.height;

    let scaleFactor;
    if (nodeRatio > imageRatio) {
      // Node is wider than image -> Image is height-constrained
      scaleFactor = originalNode.height / (pixelHeight - options.strokeWidth * 2 * (pixelWidth / originalNode.width)); // Approximation
      // Better: Just map the "content" part.
      // The generated image is (Content + 2*Stroke).
      // We want (Content) to be approx (Node Height).
      // So DisplayHeight = NodeHeight + 2*Stroke.
      // And DisplayWidth = DisplayHeight * ImageRatio.
      displayHeight = originalNode.height + options.strokeWidth * 2;
      displayWidth = displayHeight * imageRatio;
    } else {
      // Node is taller than image -> Image is width-constrained
      displayWidth = originalNode.width + options.strokeWidth * 2;
      displayHeight = displayWidth / imageRatio;
    }

    newRect.resize(displayWidth, displayHeight);

    newRect.fills = [{
      type: 'IMAGE',
      imageHash: newImage.hash,
      scaleMode: 'FIT'
    }];

    newRect.name = "Stroked Image";

    figma.currentPage.selection = [newRect];
    figma.viewport.scrollAndZoomIntoView([newRect]);

    // Don't close plugin, allow generating again
    figma.notify("Outline added!");
  } else if (msg.type === 'error') {
    figma.notify("❌ " + msg.message);
  }
};
