/* eslint-disable */
(function () {
  'use strict';

  var socket = io.connect();

  swip.init({ socket: socket, container: document.getElementById('root'), type: 'canvas' }, function (client) {
    var converter = client.converter;
    var stage = client.stage;
    var ctx = stage.getContext('2d');

    var blobs = [];
    var activeBlobs = [];
    var blobsClicked = [];

    client.onDragStart(function (evt) {
      evt.position.forEach(function (pos) {
        for (var i = 0; i < blobs.length; i++) {
          if (touchInRadius(pos.x, pos.y, blobs[i].x, blobs[i].y, blobs[i].size)) {
            blobsClicked.push({blob: blobs[i], index: i, lastX: pos.x, lastY: pos.y});
            blobs[i].speedX = 0;
            blobs[i].speedY = 0;
          }
        }
        client.emit('updateBlobs', { blobs: blobs })
      });

      if (blobsClicked == false) {
        evt.position.forEach(function (pos) {
          activeBlobs.push({
            x: pos.x,
            y: pos.y,
            speedX: 0,
            speedY: 0,
            size: converter.toAbsPixel(15)
          });
        });
      }
    });

    client.onDragMove(function (evt) {
      if (blobsClicked == false) {
        evt.position.forEach(function (pos) {
          for (var i = 0; i < activeBlobs.length; i++) {
            if (touchInRadius(pos.x, pos.y, activeBlobs[i].x, activeBlobs[i].y, activeBlobs[i].size)) {
              activeBlobs.splice(i, 1);
              i--;
            }
          }
        });
      } else {
        evt.position.forEach(function (pos) {
          for (var i = 0; i < blobs.length; i++) {
            if (touchInRadius(pos.x, pos.y, blobs[i].x, blobs[i].y, blobs[i].size)) {
              blobs[i].x = pos.x;
              blobs[i].y = pos.y;
            }
          }
          for (var i = 0; i < blobsClicked.length; i++) {
            if (touchInRadius(pos.x, pos.y, blobsClicked[i].x, blobsClicked[i].y, blobsClicked[i].size)) {
              blobsClicked[i].lastX = pos.x;
              blobsClicked[i].lastY = pos.y;
            }
          }
          client.emit('updateBlobs', { blobs: blobs })
        });
      }
    });

    client.onDragEnd(function (evt) {
      if (blobsClicked == false) {
        evt.position.forEach(function (pos) {
          var emitBlobs = [];
          for (var i = 0; i < activeBlobs.length; i++) {
            if (touchInRadius(pos.x, pos.y, activeBlobs[i].x, activeBlobs[i].y, activeBlobs[i].size)) {
              emitBlobs.push(activeBlobs[i]);
              activeBlobs.splice(i, 1);
              i--;
            }
          }
          if (emitBlobs) {
            client.emit('addBlobs', { blobs: emitBlobs });
          }
        });
      } else {
        evt.position.forEach(function (pos) {
          var emitBlobs = [];
          for (var i = 0; i < blobsClicked.length; i++) {
            var currBlob = blobsClicked[i].blob;
            var currBlobIndex = blobsClicked[i].index;
            var startX = blobsClicked[i].lastX;
            var startY = blobsClicked[i].lastY;

            if (touchInRadius(pos.x, pos.y, currBlob.x, currBlob.y, currBlob.size * 10)) {
              blobs[currBlobIndex].speedX = (Math.abs(pos.x) - Math.abs(startX)) / 10;
              blobs[currBlobIndex].speedY = (Math.abs(pos.y) - Math.abs(startY)) / 10;
              blobsClicked.splice(i, 1);
              i--;
            }
          }
          if (emitBlobs) {
            client.emit('updateBlobs', { blobs: blobs })
          }
        });
        blobsClicked = [];
      }
    });

    client.onUpdate(function (evt) {

      if (evt.cluster) {
        var updatedBlobs = evt.cluster.data.blobs;
        blobs = updatedBlobs;

        ctx.fillStyle = evt.cluster.data.backgroundColor;
        ctx.fillRect(0, 0, stage.width, stage.height);

        ctx.save();
        ctx.translate(-converter.toDevicePixel(evt.client.transform.x), -converter.toDevicePixel(evt.client.transform.y));
        ctx.scale(converter.toDevicePixel(1), converter.toDevicePixel(1));

        drawOpenings(ctx, evt.client);
        drawBlobs();

        ctx.restore();
      }
    });
  });

  function applyTransform () {

  }

  function increaseActiveBlobSize () {
    if (activeBlobs) {
      for(var i = 0; i < activeBlobs.length; i++) {
        activeBlobs[i].size += 1;
      }
    }
  }

  function drawBlobs () {
    activeBlobs.forEach(function(blob) {
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, blob.size , 0, 2 * Math.PI, false);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    });

    updatedBlobs.forEach(function (blob) {
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, blob.size , 0, 2 * Math.PI, false);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    });
  }

  function touchInRadius (posX, posY, blobX, blobY, blobsSize) {
    var inRadius = false;
    blobsSize *= 2;

    if ((posX < (blobX + blobsSize) && posX > (blobX - blobsSize)) &&
      (posY < (blobY + blobsSize) && posY > (blobY - blobsSize))) {
      inRadius = true;
    }

    return inRadius;
  }

  function drawOpenings (ctx, client) {
    var openings = client.openings;
    var transformX = client.transform.x;
    var transformY = client.transform.y;
    var width = client.size.width;
    var height = client.size.height;

    ctx.lineWidth = 5;
    ctx.shadowBlur = 5;

    openings.left.forEach(function (wall) {
      ctx.strokeStyle = "#ff9e00";
      ctx.shadowColor = "#ff9e00";

      ctx.beginPath();
      ctx.moveTo(transformX, wall.start + transformY);
      ctx.lineTo(transformX, wall.end + transformY);
      ctx.stroke();
    });

    openings.top.forEach(function (wall) {
      ctx.strokeStyle = "#0084FF";
      ctx.shadowColor = "#0084FF";

      ctx.beginPath();
      ctx.moveTo(wall.start + transformX, transformY);
      ctx.lineTo(wall.end + transformX, transformY);
      ctx.stroke();
    });

    openings.right.forEach(function (wall) {
      ctx.strokeStyle = "#0084FF";
      ctx.shadowColor = "#0084FF";

      ctx.beginPath();
      ctx.moveTo(width + transformX, wall.start + transformY);
      ctx.lineTo(width + transformX, wall.end + transformY);
      ctx.stroke();
    });

    openings.bottom.forEach(function (wall) {
      ctx.strokeStyle = "#ff9e00";
      ctx.shadowColor = "#ff9e00";

      ctx.beginPath();
      ctx.moveTo(wall.start + transformX, height + transformY);
      ctx.lineTo(wall.end + transformX, height + transformY);
      ctx.stroke();
    });
  }
}());
