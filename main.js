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
    constructor(objects) {
      this.objects = objects;
    }
    intersectionWithRay(ray) {
      let nearestDistance = Number.MAX_VALUE;
      let nearestIntersection;
      for (let object of this.objects) {
        let i = object.intersectionWithRay(ray);
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
  }

  class Camera {
    constructor(position, direction, focalLength, filmDPM, filmSpeed, multiSample) {
      this.position = position;
      this.direction = direction;
      this.focalLength = focalLength;
      this.filmDPM = filmDPM;
      this.filmSpeed = filmSpeed;
      this.multiSample = multiSample;
    }
    raysForCoordinate(x, y) {
      const rays = [];
      const cell2center = new Vec3(
        x / this.filmDPM,
        y / this.filmDPM,
        this.focalLength
      );

      const offsetMin = this.multiSample / -2;
      const offsetMax = this.multiSample / 2;
      for (let ox = offsetMin; ox < offsetMax; ox++) {
        for (let oy = offsetMin; oy < offsetMax; oy++) {
          const offset = Vec3.scale(new Vec3(ox, oy, 0), 1 / this.filmDPM);
          const splitted = Vec3.add(cell2center, offset);
          const direction = Vec3.multiply(this.direction, splitted).normalize();
          rays.push(new Ray(this.position, direction));
        }
      }
      return rays;
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
    tracePathInScene(scene, depth = 0) {
      if (depth === 5) {
        return new Vec3(0, 0, 0);
      }

      const INTERSECTION = scene.intersectionWithRay(this);
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

  class Renderer {
    constructor(canvas, scene, camera) {
      this.canvas = canvas;
      this.scene = scene;
      this.camera = camera;
      this.sampleCount = 0;
      this.data = new Array(this.canvas.width * this.canvas.height).fill(Vec3.zero());
    }
    update() {
      const data = [];
      
      const minY = this.canvas.height / -2;
      const maxY = this.canvas.height / 2;
      const minX = this.canvas.width / -2;
      const maxX = this.canvas.width / 2;
      for (let y = maxY; y > minY; y--) {
        for (let x = minX; x < maxX; x++) {
          const rays = this.camera.raysForCoordinate(x, y);
          const color = rays
            .map(ray => {
              return Vec3.scale(
                ray.tracePathInScene(this.scene),
                this.camera.filmSpeed
              );
            })
            .reduce((prev, next, i) => {
              const sampleCount = i + 1;
              const nextWeight = 1 / sampleCount;
              return Vec3.add(
                Vec3.scale(next, nextWeight),
                Vec3.scale(prev, 1 - nextWeight)
              );
            });
          data.push(color);
        }
      }

      this.sampleCount += 1;
      for (let i = 0; i < this.data.length; i++) {
        this.data[i] = Vec3.add(
          Vec3.scale(this.data[i], 1 - 1 / this.sampleCount),
          Vec3.scale(data[i], 1 / this.sampleCount)
        );
      }
    }
    draw() {
      const CTX = canvas.getContext('2d');
      const GAMMA_CORRECTION_POWER = 1 / 2.2;

      const IMAGE_DATA = new ImageData(this.canvas.width, this.canvas.height);
      for (let i = 0; i < this.canvas.width * this.canvas.height; i++) {
        const CORRECTED_COLOR = Vec3.pow(this.data[i], GAMMA_CORRECTION_POWER);
        const HEAD_INDEX = i * 4;
        IMAGE_DATA.data[HEAD_INDEX] = CORRECTED_COLOR.x * 255;
        IMAGE_DATA.data[HEAD_INDEX + 1] = CORRECTED_COLOR.y * 255;
        IMAGE_DATA.data[HEAD_INDEX + 2] = CORRECTED_COLOR.z * 255;
        IMAGE_DATA.data[HEAD_INDEX + 3] = 255;
      }
      CTX.putImageData(IMAGE_DATA, 0, 0);
    }
  }

  const CAMERA = new Camera(
    new Vec3(0, 2, -5),
    new Vec3(1, 1, 1),
    0.028,
    10000,
    1.5,
    2
  );
  const LIGHT_MATERIAL = new Material(new Vec3(0, 0, 0), new Vec3(10, 10, 10));
  const WHITE_MATERIAL = new Material(new Vec3(1, 1, 1), new Vec3(0, 0, 0));
  const BLUE_MATERIAL = new Material(new Vec3(0, 0, 1), new Vec3(0, 0, 0));
  const YELLOW_MATERIAL = new Material(new Vec3(1, 1, 0), new Vec3(0, 0, 0));
  const SCENE = new Scene([
    new Plane(new Vec3(2, 0, 0), new Vec3(-1, 0, 0), BLUE_MATERIAL), // left
    new Plane(new Vec3(-2, 0, 0), new Vec3(1, 0, 0), YELLOW_MATERIAL), // right
    new Plane(new Vec3(0, 4, 0), new Vec3(0, -1, 0), WHITE_MATERIAL), // top
    new Plane(new Vec3(0, 0, 0), new Vec3(0, 1, 0), WHITE_MATERIAL), // bottom
    new Plane(new Vec3(0, 0, 2), new Vec3(0, 0, -1), WHITE_MATERIAL), // back
    new Plane(new Vec3(0, 0, -2), new Vec3(0, 0, 1), WHITE_MATERIAL), // front
    new Sphere(new Vec3(0, 7.95, 0), 4, LIGHT_MATERIAL), // light
    new Sphere(new Vec3(0, 1, 0), 1, WHITE_MATERIAL)
  ]);

  const RENDERER = new Renderer(canvas, SCENE, CAMERA);
  const CONSOLE = document.getElementById('sample_count');

  const draw = () => {
    RENDERER.draw();
    CONSOLE.textContent =
      `Current sampling count: ${RENDERER.sampleCount}`;

    window.requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('DOMContentLoaded', () => {
    for (let i = 0; i < 2000; i++) {
      window.setTimeout(() => {
        RENDERER.update();
      }, 0);
    }
  });
})();
