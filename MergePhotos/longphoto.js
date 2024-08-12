const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 获取图片目录
const imagesDir = __dirname;

// 读取文件夹中的所有文件
fs.readdir(imagesDir, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  // 过滤出图片文件 (可以根据文件扩展名进行过滤)
  const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file));

  // 如果没有图片文件，则退出
  if (imageFiles.length === 0) {
    console.log('No image files found.');
    return;
  }

  // 读取所有图片文件的信息
  const imagePromises = imageFiles.map(file => {
    return sharp(path.join(imagesDir, file)).metadata();
  });

  // 获取所有图片的信息
  Promise.all(imagePromises).then(metadatas => {
    const width = Math.min(...metadatas.map(metadata => metadata.width)); // 找出最小的宽度
    const totalHeight = metadatas.reduce((sum, metadata) => sum + metadata.height * (width / metadata.width), 0); // 按比例调整高度

    // 创建一个空的图像来合并所有图片
    const compositeImage = sharp({
      create: {
        width: width,
        height: Math.round(totalHeight),
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    });

    let top = 0;
    const compositeOperations = [];

    imageFiles.forEach((file, index) => {
      const scaledHeight = Math.round(metadatas[index].height * (width / metadatas[index].width));
      compositeOperations.push({
        input: sharp(path.join(imagesDir, file)).resize(width, scaledHeight).toBuffer(), // 调整宽度，并按比例调整高度
        top: top,
        left: 0
      });
      top += scaledHeight;
    });

    // 合并所有图片
    Promise.all(compositeOperations.map(op => op.input)).then(buffers => {
      const ops = buffers.map((buffer, i) => ({
        input: buffer,
        top: compositeOperations[i].top,
        left: compositeOperations[i].left
      }));
      compositeImage
        .composite(ops)
        .toFile(path.join(imagesDir, 'output.jpg'))
        .then(() => {
          console.log('Output image created: output.jpg');
        })
        .catch(err => {
          console.error('Error creating output image:', err);
        });
    }).catch(err => {
      console.error('Error processing images:', err);
    });

  }).catch(err => {
    console.error('Error reading image metadata:', err);
  });
});
