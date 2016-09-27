(() => {
  'use strict';

  class Vec3 {
    constructor(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    squaredLength() {
      return Vec3.dot(this, this);
    }
    length() {
      return Math.sqrt(this.squaredLength());
    }
    normalize() {
      return Vec3.scale(this, 1 / this.length());
    }

    static zero() {
      return new Vec3(0, 0, 0);
    }

    static add(a, b) {
      return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
    }
    static subtract(a, b) {
      return new Vec3(a.x - b.x, a.y - b.y, a.z - b.z);
    }
    static multiply(a, b) {
      return new Vec3(a.x * b.x, a.y * b.y, a.z * b.z);
    }
    static divide(a, b) {
      return new Vec3(a.x / b.x, a.y / b.y, a.z / b.z);
    }
    static cross(a, b) {
      return new Vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
    }
    static dot(a, b) {
      return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    static scale(a, b) {
      return new Vec3(a.x * b, a.y * b, a.z * b);
    }
    static pow(a, b) {
      return new Vec3(Math.pow(a.x, b), Math.pow(a.y, b), Math.pow(a.z, b));
    }
  }

  class Scene {
    constructor(camera, objects) {
      this.camera = camera;
      this.objects = objects;
    }
  }

  class Camera {
    constructor(position, direction, focalLength, filmSize) {
      this.position = position;
      this.direction = direction;
      this.focalLength = focalLength;
      this.filmSize = filmSize;
    }
    rayForCoordinate(x, y) {
      const RAW_D = new Vec3(
        this.filmSize.x * x,
        this.filmSize.y * y,
        this.focalLength
      );
      const D = Vec3.multiply(this.direction, RAW_D).normalize();
      return new Ray(this.position, D);
    }
  }

  class Plane {
    constructor(center, normal, material) {
      this.center = center;
      this.normal = normal;
      this.material = material;
    }
    intersectionWithRay(ray) {
      const V = Vec3.subtract(ray.origin, this.center);
      const VN = Vec3.dot(V, this.normal);
      const DN = Vec3.dot(ray.direction, this.normal);
      if (DN >= 0) {
        return new Intersection(false);
      }
      const T = VN / DN * -1;
      if (T <= 0) {
        return new Intersection(false);
      }
      return new Intersection(true, T, this.normal, this.material);
    }
  }

  class Sphere {
    constructor(center, radius, material) {
      this.center = center;
      this.radius = radius;
      this.material = material;
    }
    intersectionWithRay(ray) {
      const V = Vec3.subtract(ray.origin, this.center);
      const B = Vec3.dot(V, ray.direction);
      const C = V.squaredLength() - Math.pow(this.radius, 2);
      const D = Math.pow(B, 2) - C;
      if (D < 0) {
        return new Intersection(false);
      }
      const SQRT_D = Math.sqrt(D)
      const T1 = -1 * B + SQRT_D;
      const T2 = -1 * B - SQRT_D;
      if (T2 > 0) {
        return this.createIntersection(ray, T2);
      } else if (T1 > 0) {
        return this.createIntersection(ray, T1);
      } else {
        return new Intersection(false);
      }
    }
    createIntersection(ray, t) {
      const P = Vec3.add(ray.origin, Vec3.scale(ray.direction, t));
      const NORMAL = Vec3.subtract(P, this.center).normalize();
      return new Intersection(true, t, NORMAL, this.material);
    }
  }

  class Material {
    constructor(color, emission) {
      this.color = color;
      this.emission = emission;
    }
  }

  class Intersection {
    constructor(isHit, distance, normal, material) {
      this.isHit = isHit;
      this.distance = distance;
      this.normal = normal;
      this.material = material;
    }
  }

  class Ray {
    constructor(origin, direction) {
      this.origin = origin;
      this.direction = direction;
    }
    intersectionWithScene(scene) {
      let nearestDistance = Number.MAX_VALUE;
      let nearestIntersection;
      for (let object of scene.objects) {
        let i = object.intersectionWithRay(this);
        if (!i.isHit) {
          continue;
        }
        if (nearestDistance > i.distance) {
          nearestDistance = i.distance;
          nearestIntersection = i;
        }
      }
      return nearestIntersection;
    }
    tracePathInScene(scene, depth = 0) {
      if (depth === 5) {
        return new Vec3(0, 0, 0);
      }
      
      const INTERSECTION = this.intersectionWithScene(scene);
      if (!INTERSECTION) {
        return new Vec3(0, 0, 0);
      }

      const NEW_RAY = new Ray(
        Vec3.add(this.origin, Vec3.scale(this.direction, INTERSECTION.distance)),
        Ray.randomReflectionFromNormal(INTERSECTION.normal)
      );

      const COS_THETA = Vec3.dot(
        NEW_RAY.direction,
        INTERSECTION.normal
      );
      const DIFFUSE = Vec3.scale(
        INTERSECTION.material.color,
        COS_THETA * 2
      );
      const REFLECTION = NEW_RAY.tracePathInScene(scene, depth + 1);
      return Vec3.add(
        INTERSECTION.material.emission,
        Vec3.multiply(DIFFUSE, REFLECTION)
      );
    }

    static randomReflectionFromNormal(normal) {
      const THETA = Math.acos(Math.random());
      const PHI = 2 * Math.PI * Math.random();
      const RANDOM_DIRECTION = new Vec3(
        Math.sin(THETA) * Math.cos(PHI),
        Math.cos(THETA),
        Math.sin(THETA) * Math.sin(PHI)
      );

      if (Vec3.dot(normal, RANDOM_DIRECTION) < 0) {
        return Vec3.scale(RANDOM_DIRECTION, -1);
      }
      return RANDOM_DIRECTION;
    }
  }

  class Sample {
    constructor(data, width, height) {
      this.data = data;  
      this.width = width;  
      this.height = height;  
    }
  }

  function sample(width, height) {
    let data = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const X = x / width - 0.5;
        const Y = (y / height - 0.5) * -1;

        const CAMERA = new Camera(
          new Vec3(0, 2, -5),
          new Vec3(1, 1, 1),
          0.028,
          new Vec3(0.036, 0.024)
        );
        const LIGHT_MATERIAL = new Material(new Vec3(0, 0, 0), new Vec3(2, 2, 2));
        const WHITE_MATERIAL = new Material(new Vec3(1, 1, 1), new Vec3(0, 0, 0));
        const BLUE_MATERIAL = new Material(new Vec3(0, 0, 1), new Vec3(0, 0, 0));
        const YELLOW_MATERIAL = new Material(new Vec3(1, 1, 0), new Vec3(0, 0, 0));
        const SCENE = new Scene(CAMERA, [
          new Sphere(new Vec3(0, 7.9, 0), 4, LIGHT_MATERIAL), // light
          new Plane(new Vec3(2, 0, 0), new Vec3(-1, 0, 0), BLUE_MATERIAL), // left
          new Plane(new Vec3(-2, 0, 0), new Vec3(1, 0, 0), YELLOW_MATERIAL), // right
          new Plane(new Vec3(0, 4, 0), new Vec3(0, -1, 0), WHITE_MATERIAL), // top
          new Plane(new Vec3(0, 0, 0), new Vec3(0, 1, 0), WHITE_MATERIAL), // bottom
          new Plane(new Vec3(0, 0, 2), new Vec3(0, 0, -1), WHITE_MATERIAL), // back
          new Plane(new Vec3(0, 0, -2), new Vec3(0, 0, 1), WHITE_MATERIAL), // front
          new Sphere(new Vec3(0, 1, 0), 1, WHITE_MATERIAL)
        ]);

        const RAY = SCENE.camera.rayForCoordinate(X, Y);
        const COLOR = RAY.tracePathInScene(SCENE);

        data.push(COLOR);
      }
    }

    return new Sample(data, width, height);
  }

  function draw(sample) {
    const CTX = canvas.getContext('2d');
    const sRGB_GAMUT = 1 / 2.2;

    const IMAGE_DATA = new ImageData(sample.width, sample.height);
    for (let i = 0; i < sample.data.length; i++) {
      const CORRECTED_COLOR = Vec3.pow(sample.data[i], sRGB_GAMUT);
      const HEAD_INDEX = i * 4;
      IMAGE_DATA.data[HEAD_INDEX] = CORRECTED_COLOR.x * 255;
      IMAGE_DATA.data[HEAD_INDEX + 1] = CORRECTED_COLOR.y * 255;
      IMAGE_DATA.data[HEAD_INDEX + 2] = CORRECTED_COLOR.z * 255;
      IMAGE_DATA.data[HEAD_INDEX + 3] = 255;
    }
    CTX.putImageData(IMAGE_DATA, 0, 0);
  }

  function update(previousSample, count = 1) {
    if (count > 1000) {
      return;
    }
    
    const NEW_SAMPLE = sample(previousSample.width, previousSample.height);

    let data = [];
    for(let i = 0; i < previousSample.data.length; i++) {
      const COLOR = Vec3.add(
        Vec3.scale(previousSample.data[i], 1 - 1 / count),
        Vec3.scale(NEW_SAMPLE.data[i], 1 / count)
      );
      data.push(COLOR);
    }

    const BUFFER = new Sample(data, previousSample.width, previousSample.height);
    draw(BUFFER);

    document.getElementById('sample_count').textContent = `Current sampling count: ${ count }`;

    window.requestAnimationFrame(() => {
      update(BUFFER, count + 1);
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    // draw(sample(canvas.width, canvas.height));
    window.requestAnimationFrame(() => { update(sample(canvas.width, canvas.height)); });
  });

})();
