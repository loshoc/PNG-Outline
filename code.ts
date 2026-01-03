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

    // Check if node type supports export
    if (!('exportAsync' in node)) {
      figma.ui.postMessage({
        type: 'error',
        message: "Selected node cannot be exported. Please select an image, frame, or shape."
      });
      return;
    }

    // Show processing notification
    figma.notify("⏳ Processing...", { timeout: 2000 });

    // Export the node as it appears on canvas (respects crop position)
    // Use 2x scale for better quality
    try {
      const exportScale = 4;
      const bytes = await node.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: exportScale }
      });

      // Send data + options to UI for processing
      figma.ui.postMessage({
        type: 'process-image',
        bytes: bytes,
        width: node.width,
        height: node.height,
        exportScale: exportScale,
        options: msg.options
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Export error:', errorMsg);
      figma.ui.postMessage({
        type: 'error',
        message: "Failed to export: " + errorMsg
      });
    }

  } else if (msg.type === 'image-processed') {
    // UI finished processing
    const { data, options } = msg;
    const newBytes = data;
    const newImage = figma.createImage(newBytes);

    const newRect = figma.createRectangle();
    const originalNode = figma.currentPage.selection[0];

    // Place on top of original, offset by stroke width
    // If original is at (0,0) with stroke x, new image starts at (-x,-x)
    newRect.x = originalNode.x - options.strokeWidth;
    newRect.y = originalNode.y - options.strokeWidth;

    // The generated image contains the original content + stroke padding
    // Display size = original node size + 2 * stroke width
    const displayWidth = originalNode.width + options.strokeWidth * 2;
    const displayHeight = originalNode.height + options.strokeWidth * 2;

    newRect.resize(displayWidth, displayHeight);

    newRect.fills = [{
      type: 'IMAGE',
      imageHash: newImage.hash,
      scaleMode: 'FILL'  // Use FILL to maintain pixel-perfect quality
    }];

    newRect.name = "Stroked Image";

    figma.currentPage.selection = [newRect];
    figma.viewport.scrollAndZoomIntoView([newRect]);

    // Don't close plugin, allow generating again
    figma.notify("✅ Outline added!");
  } else if (msg.type === 'error') {
    figma.notify("❌ " + msg.message);
  }
};
