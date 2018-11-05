(() => {
  "use strict";

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
      return new Vec3(
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x
      );
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
        if (i.distance < nearestDistance) {
          nearestDistance = i.distance;
          nearestIntersection = i;
        }
      }
      return nearestIntersection;
    }
  }

  class Camera {
    constructor(
      position,
      direction,
      focalLength,
      filmDPM,
      filmSpeed,
      multiSample
    ) {
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
      const v = Vec3.subtract(ray.origin, this.center);
      const vn = Vec3.dot(v, this.normal);
      const dn = Vec3.dot(ray.direction, this.normal);
      if (0 <= dn) {
        return new Intersection(false);
      }
      const t = (vn / dn) * -1;
      if (t <= 0) {
        return new Intersection(false);
      }
      return new Intersection(true, t, this.normal, this.material);
    }
  }

  class Sphere {
    constructor(center, radius, material) {
      this.center = center;
      this.radius = radius;
      this.material = material;
    }
    intersectionWithRay(ray) {
      const v = Vec3.subtract(ray.origin, this.center);
      const b = Vec3.dot(v, ray.direction);
      const c = v.squaredLength() - Math.pow(this.radius, 2);
      const d = Math.pow(b, 2) - c;
      if (d < 0) {
        return new Intersection(false);
      }
      const sqrtD = Math.sqrt(d);
      const t1 = -1 * b + sqrtD;
      const t2 = -1 * b - sqrtD;
      if (0 < t2) {
        return this.createIntersection(ray, t2);
      } else if (0 < t1) {
        return this.createIntersection(ray, t1);
      } else {
        return new Intersection(false);
      }
    }
    createIntersection(ray, t) {
      const p = Vec3.add(ray.origin, Vec3.scale(ray.direction, t));
      const normal = Vec3.subtract(p, this.center).normalize();
      return new Intersection(true, t, normal, this.material);
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

      const intersection = scene.intersectionWithRay(this);
      if (!intersection) {
        return new Vec3(0, 0, 0);
      }

      const newRay = new Ray(
        Vec3.add(
          this.origin,
          Vec3.scale(this.direction, intersection.distance)
        ),
        Ray.randomReflectionFromNormal(intersection.normal)
      );

      const cosTheta = Vec3.dot(newRay.direction, intersection.normal);
      const diffuse = Vec3.scale(intersection.material.color, cosTheta * 2);
      const reflection = newRay.tracePathInScene(scene, depth + 1);
      return Vec3.add(
        intersection.material.emission,
        Vec3.multiply(diffuse, reflection)
      );
    }

    static randomReflectionFromNormal(normal) {
      const theta = Math.acos(Math.random());
      const phi = 2 * Math.PI * Math.random();
      const randomDirection = new Vec3(
        Math.sin(theta) * Math.cos(phi),
        Math.cos(theta),
        Math.sin(theta) * Math.sin(phi)
      );

      if (Vec3.dot(normal, randomDirection) < 0) {
        return Vec3.scale(randomDirection, -1);
      }
      return randomDirection;
    }
  }

  class Renderer {
    constructor(canvas, scene, camera) {
      this.canvas = canvas;
      this.scene = scene;
      this.camera = camera;
      this.sampleCount = 0;
      this.data = new Array(this.canvas.width * this.canvas.height).fill(
        Vec3.zero()
      );
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
        const newSampleWeight = 1 / this.sampleCount;
        this.data[i] = Vec3.add(
          Vec3.scale(data[i], newSampleWeight),
          Vec3.scale(this.data[i], 1 - newSampleWeight)
        );
      }
    }
    draw() {
      const ctx = this.canvas.getContext("2d");
      const gammaCorrectionPower = 1 / 2.2;

      const imageData = new ImageData(this.canvas.width, this.canvas.height);
      for (let i = 0; i < this.canvas.width * this.canvas.height; i++) {
        const corrected = Vec3.pow(this.data[i], gammaCorrectionPower);
        const di = i * 4;
        imageData.data[di] = corrected.x * 255;
        imageData.data[di + 1] = corrected.y * 255;
        imageData.data[di + 2] = corrected.z * 255;
        imageData.data[di + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
    }
  }

  const camera = new Camera(
    new Vec3(0, 2, -5),
    new Vec3(1, 1, 1),
    0.028,
    10000,
    1.5,
    2
  );
  const lightMaterial = new Material(new Vec3(0, 0, 0), new Vec3(10, 10, 10));
  const whiteMaterial = new Material(new Vec3(1, 1, 1), new Vec3(0, 0, 0));
  const blueMaterial = new Material(new Vec3(0, 0, 1), new Vec3(0, 0, 0));
  const yellowMaterial = new Material(new Vec3(1, 1, 0), new Vec3(0, 0, 0));
  const scene = new Scene([
    new Plane(new Vec3(2, 0, 0), new Vec3(-1, 0, 0), blueMaterial), // left
    new Plane(new Vec3(-2, 0, 0), new Vec3(1, 0, 0), yellowMaterial), // right
    new Plane(new Vec3(0, 4, 0), new Vec3(0, -1, 0), whiteMaterial), // top
    new Plane(new Vec3(0, 0, 0), new Vec3(0, 1, 0), whiteMaterial), // bottom
    new Plane(new Vec3(0, 0, 2), new Vec3(0, 0, -1), whiteMaterial), // back
    new Plane(new Vec3(0, 0, -2), new Vec3(0, 0, 1), whiteMaterial), // front
    new Sphere(new Vec3(0, 7.95, 0), 4, lightMaterial), // light
    new Sphere(new Vec3(0, 1, 0), 1, whiteMaterial)
  ]);

  const renderer = new Renderer(canvas, scene, camera);

  const draw = () => {
    renderer.draw();
    debug.textContent = `Current sampling count: ${renderer.sampleCount}`;

    window.requestAnimationFrame(draw);
  };
  draw();

  window.addEventListener("DOMContentLoaded", () => {
    for (let i = 0; i < 2000; i++) {
      window.setTimeout(() => {
        renderer.update();
      }, 0);
    }
  });
})();
