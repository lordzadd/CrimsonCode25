'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMHumanBoneName } from '@pixiv/three-vrm'
import type { PoseFrame } from '@/types/pose'

interface VrmAvatarProps {
  pose: PoseFrame | null
  wireframe?: boolean
  opacity?: number
  vrmUrl?: string
}

export function VrmAvatar({ pose, wireframe = false, opacity = 0.92, vrmUrl }: VrmAvatarProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const fallbackRef = useRef<THREE.Group | null>(null)
  const vrmRef = useRef<{
    scene: THREE.Object3D
    update: (delta: number) => void
    humanoid?: { getNormalizedBoneNode: (name: string) => THREE.Object3D | null }
  } | null>(null)
  const styleRef = useRef({ wireframe, opacity })

  const setBoneRotation = (
    boneName: string,
    zAngle: number,
    xAngle = 0
  ) => {
    const bone = vrmRef.current?.humanoid?.getNormalizedBoneNode(boneName)
    if (!bone) {
      return
    }

    const target = new THREE.Quaternion().setFromEuler(new THREE.Euler(xAngle, 0, zAngle))
    bone.quaternion.slerp(target, 0.35)
  }

  const mapAngle = (a: { x: number; y: number } | undefined, b: { x: number; y: number } | undefined): number => {
    if (!a || !b) {
      return 0
    }
    return Math.atan2(b.y - a.y, b.x - a.x)
  }

  useEffect(() => {
    if (!mountRef.current) {
      return
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0a1222')

    const camera = new THREE.PerspectiveCamera(45, 1.7, 0.1, 100)
    camera.position.set(-2, 1.2, 3.5)
    camera.lookAt(0, 1.2, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(mountRef.current.clientWidth || 600, mountRef.current.clientHeight || 350)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mountRef.current.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight('#ffffff', 0.7))
    const sun = new THREE.DirectionalLight('#a2d2ff', 1.2)
    sun.position.set(3, 5, 4)
    scene.add(sun)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 32),
      new THREE.MeshStandardMaterial({ color: '#1f2937', transparent: true, opacity: 0.35 })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -1.1
    scene.add(floor)

    const syncMaterialStyles = () => {
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) {
          return
        }

        const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
        materials.forEach((mat) => {
          mat.wireframe = styleRef.current.wireframe
          mat.transparent = true
          mat.opacity = styleRef.current.opacity
          mat.needsUpdate = true
        })
      })
    }

    const makeFallback = () => {
      const group = new THREE.Group()
      const material = new THREE.MeshStandardMaterial({
        color: '#22d3ee',
        emissive: '#0f172a',
        wireframe: styleRef.current.wireframe,
        transparent: true,
        opacity: styleRef.current.opacity,
      })

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.6, 6, 12), material)
      torso.position.y = 0.2
      group.add(torso)

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 18), material)
      head.position.y = 0.72
      group.add(head)

      const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.52, 4, 8), material)
      leftArm.position.set(-0.35, 0.25, 0)
      leftArm.name = 'leftArm'
      group.add(leftArm)

      const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.52, 4, 8), material)
      rightArm.position.set(0.35, 0.25, 0)
      rightArm.name = 'rightArm'
      group.add(rightArm)

      const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.64, 4, 8), material)
      leftLeg.position.set(-0.14, -0.5, 0)
      leftLeg.name = 'leftLeg'
      group.add(leftLeg)

      const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.64, 4, 8), material)
      rightLeg.position.set(0.14, -0.5, 0)
      rightLeg.name = 'rightLeg'
      group.add(rightLeg)

      fallbackRef.current = group
      scene.add(group)
    }

    let vrmModel: {
      scene: THREE.Object3D
      update: (delta: number) => void
      humanoid?: { getNormalizedBoneNode: (name: string) => THREE.Object3D | null }
    } | null = null
    if (vrmUrl) {
      void (async () => {
        try {
          const vrmPkg = await import('@pixiv/three-vrm')
          const loader = new GLTFLoader()
          loader.register((parser) => new vrmPkg.VRMLoaderPlugin(parser))

          loader.load(
            vrmUrl,
            (gltf) => {
              const model = gltf.userData.vrm as { scene: THREE.Object3D; update: (delta: number) => void } | undefined
              if (!model) {
                makeFallback()
                return
              }
              vrmModel = model
              vrmRef.current = model
              vrmModel.scene.position.y = -1.05
              scene.add(vrmModel.scene)
              syncMaterialStyles()
            },
            undefined,
            () => makeFallback()
          )
        } catch {
          makeFallback()
        }
      })()
    } else {
      makeFallback()
    }

    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      vrmModel?.update(1 / 60)
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!mountRef.current) {
        return
      }
      const { clientWidth, clientHeight } = mountRef.current
      renderer.setSize(clientWidth, clientHeight)
      camera.aspect = clientWidth / Math.max(clientHeight, 1)
      camera.updateProjectionMatrix()
    }

    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })
      renderer.dispose()
      vrmRef.current = null
      fallbackRef.current = null
      mountRef.current?.removeChild(renderer.domElement)
    }
  }, [vrmUrl])

  useEffect(() => {
    styleRef.current = { wireframe, opacity }

    const group = fallbackRef.current
    if (group) {
      group.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) {
          return
        }
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
        materials.forEach((mat) => {
          mat.wireframe = wireframe
          mat.opacity = opacity
          mat.transparent = true
          mat.needsUpdate = true
        })
      })
    }

    const vrm = vrmRef.current
    if (vrm) {
      vrm.scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) {
          return
        }
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
        materials.forEach((mat) => {
          mat.wireframe = wireframe
          mat.opacity = opacity
          mat.transparent = true
          mat.needsUpdate = true
        })
      })
    }
  }, [opacity, wireframe])

  useEffect(() => {
    if (!pose) {
      return
    }

    const leftShoulder = pose.keypoints[11]
    const rightShoulder = pose.keypoints[12]
    const leftElbow = pose.keypoints[13]
    const rightElbow = pose.keypoints[14]
    const leftWrist = pose.keypoints[15]
    const rightWrist = pose.keypoints[16]
    const leftHip = pose.keypoints[23]
    const rightHip = pose.keypoints[24]
    const leftKnee = pose.keypoints[25]
    const rightKnee = pose.keypoints[26]
    const leftAnkle = pose.keypoints[27]
    const rightAnkle = pose.keypoints[28]

    const leftUpperArmAngle = mapAngle(leftShoulder, leftElbow)
    const leftLowerArmAngle = mapAngle(leftElbow, leftWrist)
    const rightUpperArmAngle = mapAngle(rightShoulder, rightElbow)
    const rightLowerArmAngle = mapAngle(rightElbow, rightWrist)
    const leftUpperLegAngle = mapAngle(leftHip, leftKnee)
    const leftLowerLegAngle = mapAngle(leftKnee, leftAnkle)
    const rightUpperLegAngle = mapAngle(rightHip, rightKnee)
    const rightLowerLegAngle = mapAngle(rightKnee, rightAnkle)

    const shoulderMid = leftShoulder && rightShoulder
      ? { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 }
      : undefined
    const hipMid = leftHip && rightHip ? { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 } : undefined
    const spineAngle = mapAngle(hipMid, shoulderMid)

    setBoneRotation(VRMHumanBoneName.Spine, spineAngle - Math.PI / 2, 0.05)
    setBoneRotation(VRMHumanBoneName.LeftUpperArm, leftUpperArmAngle - Math.PI / 2)
    setBoneRotation(VRMHumanBoneName.LeftLowerArm, leftLowerArmAngle - Math.PI / 2)
    setBoneRotation(VRMHumanBoneName.RightUpperArm, rightUpperArmAngle - Math.PI / 2)
    setBoneRotation(VRMHumanBoneName.RightLowerArm, rightLowerArmAngle - Math.PI / 2)
    setBoneRotation(VRMHumanBoneName.LeftUpperLeg, leftUpperLegAngle - Math.PI / 2)
    setBoneRotation(VRMHumanBoneName.LeftLowerLeg, leftLowerLegAngle - Math.PI / 2)
    setBoneRotation(VRMHumanBoneName.RightUpperLeg, rightUpperLegAngle - Math.PI / 2)
    setBoneRotation(VRMHumanBoneName.RightLowerLeg, rightLowerLegAngle - Math.PI / 2)

    const fallback = fallbackRef.current
    if (fallback) {
      const leftArm = fallback.getObjectByName('leftArm') as THREE.Mesh | null
      const rightArm = fallback.getObjectByName('rightArm') as THREE.Mesh | null
      const leftLeg = fallback.getObjectByName('leftLeg') as THREE.Mesh | null
      const rightLeg = fallback.getObjectByName('rightLeg') as THREE.Mesh | null

      if (leftArm && rightArm && leftLeg && rightLeg) {
        leftArm.rotation.z = leftUpperArmAngle - Math.PI / 2
        rightArm.rotation.z = rightUpperArmAngle - Math.PI / 2
        leftLeg.rotation.z = leftUpperLegAngle - Math.PI / 2
        rightLeg.rotation.z = rightUpperLegAngle - Math.PI / 2
      }
    }
  }, [pose])

  return <div ref={mountRef} className="h-full w-full rounded-xl border border-zinc-700" />
}
