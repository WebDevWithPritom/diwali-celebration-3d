import bpy
import bmesh
import math
import os

# ==============================================================================
# BLENDER 5.x PROCEDURAL 3D DIWALI GENERATOR
# Creates Clay Diyas, Brass Aarti Lamp, Lotus Diya, Mithai & Warm Festive Studio
# ==============================================================================

def clean_scene():
    """Remove default cube, lights and camera"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        if block.users == 0: bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0: bpy.data.materials.remove(block)

# --- PBR MATERIALS ---
def create_materials():
    mats = {}

    # 1. Terracotta Clay Material
    clay = bpy.data.materials.new(name="TerracottaClay")
    clay.use_nodes = True
    bsdf = clay.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.72, 0.25, 0.08, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.78
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = 0.3
        elif 'Specular' in bsdf.inputs:
            bsdf.inputs['Specular'].default_value = 0.3
    mats['clay'] = clay

    # 2. Polished Sacred Brass Material
    brass = bpy.data.materials.new(name="SacredBrass")
    brass.use_nodes = True
    bsdf = brass.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (1.0, 0.78, 0.18, 1.0)
        bsdf.inputs['Metallic'].default_value = 0.95
        bsdf.inputs['Roughness'].default_value = 0.22
    mats['brass'] = brass

    # 3. Luminous Golden Flame Material
    flame = bpy.data.materials.new(name="DiyaFlame")
    flame.use_nodes = True
    bsdf = flame.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (1.0, 0.9, 0.5, 1.0)
        if 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = (1.0, 0.7, 0.15, 1.0)
            bsdf.inputs['Emission Strength'].default_value = 15.0
        elif 'Emission' in bsdf.inputs:
            bsdf.inputs['Emission'].default_value = (1.0, 0.7, 0.15, 1.0)
            if 'Emission Strength' in bsdf.inputs:
                bsdf.inputs['Emission Strength'].default_value = 15.0
    mats['flame'] = flame

    # 4. Cotton Wick
    wick = bpy.data.materials.new(name="CottonWick")
    wick.use_nodes = True
    bsdf = wick.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.1, 0.08, 0.05, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.95
    mats['wick'] = wick

    # 5. Pink Lotus Petal
    lotus = bpy.data.materials.new(name="LotusPetal")
    lotus.use_nodes = True
    bsdf = lotus.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.95, 0.28, 0.65, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.45
    mats['lotus'] = lotus

    # 6. Silver Thali Material
    silver = bpy.data.materials.new(name="SilverPlatter")
    silver.use_nodes = True
    bsdf = silver.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.92, 0.92, 0.94, 1.0)
        bsdf.inputs['Metallic'].default_value = 0.95
        bsdf.inputs['Roughness'].default_value = 0.18
    mats['silver'] = silver

    # 7. Saffron Motichoor Laddoo
    laddoo = bpy.data.materials.new(name="MotichoorLaddoo")
    laddoo.use_nodes = True
    bsdf = laddoo.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (1.0, 0.52, 0.05, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.85
    mats['laddoo'] = laddoo

    # 8. Kaju Katli (Cashew diamond)
    kaju = bpy.data.materials.new(name="KajuKatli")
    kaju.use_nodes = True
    bsdf = kaju.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.95, 0.95, 0.95, 1.0)
        bsdf.inputs['Metallic'].default_value = 0.6
        bsdf.inputs['Roughness'].default_value = 0.35
    mats['kaju'] = kaju

    # 9. Stone Courtyard Terrace
    terrace = bpy.data.materials.new(name="TempleStone")
    terrace.use_nodes = True
    bsdf = terrace.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.25, 0.15, 0.35, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.65
    mats['terrace'] = terrace

    return mats

# --- 1. PROCEDURAL CLAY DIYA ---
def create_clay_diya(name, loc, rot_z, mats, is_brass=False):
    # Diya Bowl
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24, radius=0.6, depth=0.35,
        location=(loc[0], loc[1], loc[2] + 0.17)
    )
    bowl = bpy.context.active_object
    bowl.name = f"{name}_Bowl"
    bowl.data.materials.append(mats['brass'] if is_brass else mats['clay'])

    # Pinch Spout
    bpy.ops.mesh.primitive_cone_add(
        vertices=12, radius1=0.22, depth=0.45,
        location=(loc[0] + 0.45 * math.cos(rot_z), loc[1] + 0.45 * math.sin(rot_z), loc[2] + 0.22),
        rotation=(0, math.radians(60), rot_z)
    )
    spout = bpy.context.active_object
    spout.name = f"{name}_Spout"
    spout.data.materials.append(mats['brass'] if is_brass else mats['clay'])

    # Cotton Wick
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8, radius=0.04, depth=0.25,
        location=(loc[0] + 0.25 * math.cos(rot_z), loc[1] + 0.25 * math.sin(rot_z), loc[2] + 0.32),
        rotation=(0, math.radians(25), rot_z)
    )
    wick = bpy.context.active_object
    wick.name = f"{name}_Wick"
    wick.data.materials.append(mats['wick'])

    # Teardrop Flame
    bpy.ops.mesh.primitive_cone_add(
        vertices=16, radius1=0.14, depth=0.55,
        location=(loc[0] + 0.28 * math.cos(rot_z), loc[1] + 0.28 * math.sin(rot_z), loc[2] + 0.55)
    )
    flame = bpy.context.active_object
    flame.name = f"{name}_Flame"
    flame.data.materials.append(mats['flame'])

    # Flame Point Light
    bpy.ops.object.light_add(
        type='POINT', radius=0.2,
        location=(loc[0] + 0.28 * math.cos(rot_z), loc[1] + 0.28 * math.sin(rot_z), loc[2] + 0.65)
    )
    light = bpy.context.active_object
    light.name = f"{name}_Light"
    light.data.energy = 8.0 if is_brass else 4.5
    light.data.color = (1.0, 0.72, 0.2)

# --- 2. SACRED PANCH-PRADIP AARTI LAMP (5 FLAMES) ---
def create_panch_pradip(loc, mats):
    # Base Pedestal
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.5, depth=0.15, location=(loc[0], loc[1], loc[2] + 0.08))
    base = bpy.context.active_object
    base.name = "Aarti_Base"
    base.data.materials.append(mats['brass'])

    # Center Stem
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.12, depth=0.7, location=(loc[0], loc[1], loc[2] + 0.45))
    stem = bpy.context.active_object
    stem.name = "Aarti_Stem"
    stem.data.materials.append(mats['brass'])

    # Brass Platter
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.85, depth=0.08, location=(loc[0], loc[1], loc[2] + 0.8))
    platter = bpy.context.active_object
    platter.name = "Aarti_Platter"
    platter.data.materials.append(mats['brass'])

    # 5 Branching Flame Cups (Panch-Pradip)
    for i in range(5):
        angle = (i / 5.0) * math.pi * 2
        cx = loc[0] + math.cos(angle) * 0.65
        cy = loc[1] + math.sin(angle) * 0.65
        cz = loc[2] + 0.88

        # Small cup
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.12, depth=0.16, location=(cx, cy, cz))
        cup = bpy.context.active_object
        cup.name = f"Aarti_Cup_{i+1}"
        cup.data.materials.append(mats['brass'])

        # Flame
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.08, depth=0.35, location=(cx, cy, cz + 0.22))
        flame = bpy.context.active_object
        flame.name = f"Aarti_Flame_{i+1}"
        flame.data.materials.append(mats['flame'])

    # Main Aarti Light
    bpy.ops.object.light_add(type='POINT', radius=0.3, location=(loc[0], loc[1], loc[2] + 1.2))
    aarti_light = bpy.context.active_object
    aarti_light.name = "Aarti_Main_Light"
    aarti_light.data.energy = 25.0
    aarti_light.data.color = (1.0, 0.78, 0.25)

# --- 3. FLOATING LOTUS FLOWER DIYA ---
def create_lotus_diya(loc, mats):
    # Outer & Inner Petals
    num_petals = 8
    for layer, (radius, length, tilt) in enumerate([(0.4, 0.6, 65), (0.25, 0.45, 45)]):
        for i in range(num_petals):
            angle = (i / num_petals) * math.pi * 2 + (layer * math.pi / 8)
            px = loc[0] + math.cos(angle) * radius
            py = loc[1] + math.sin(angle) * radius
            pz = loc[2] + 0.08 + (layer * 0.05)

            bpy.ops.mesh.primitive_cone_add(
                vertices=6, radius1=0.14, depth=length,
                location=(px, py, pz),
                rotation=(math.radians(tilt), 0, angle)
            )
            petal = bpy.context.active_object
            petal.name = f"Lotus_Petal_L{layer}_{i+1}"
            petal.data.materials.append(mats['lotus'])

    # Center Brass Diya
    create_clay_diya("Lotus_Center", (loc[0], loc[1], loc[2] + 0.12), 0, mats, is_brass=True)

# --- 4. FESTIVE MITHAI PLATTER ---
def create_mithai_platter(loc, mats):
    # Silver Platter
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.9, depth=0.06, location=(loc[0], loc[1], loc[2] + 0.03))
    platter = bpy.context.active_object
    platter.name = "Mithai_Silver_Platter"
    platter.data.materials.append(mats['silver'])

    # Kaju Katli (Cashew Diamond sweets)
    for i in range(4):
        angle = (i / 4.0) * math.pi * 2
        kx = loc[0] + math.cos(angle) * 0.38
        ky = loc[1] + math.sin(angle) * 0.38
        bpy.ops.mesh.primitive_cube_add(
            size=0.22, location=(kx, ky, loc[2] + 0.08),
            rotation=(0, 0, angle + math.radians(45))
        )
        kaju = bpy.context.active_object
        kaju.scale = (1.4, 0.7, 0.25)
        kaju.name = f"KajuKatli_{i+1}"
        kaju.data.materials.append(mats['kaju'])

    # Motichoor Laddoos (Saffron spheres)
    for j in range(5):
        angle = (j / 5.0) * math.pi * 2 + 0.3
        lx = loc[0] + math.cos(angle) * 0.55
        ly = loc[1] + math.sin(angle) * 0.55
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=12, ring_count=10, radius=0.12,
            location=(lx, ly, loc[2] + 0.12)
        )
        laddoo = bpy.context.active_object
        laddoo.name = f"Laddoo_{j+1}"
        laddoo.data.materials.append(mats['laddoo'])

# --- 5. STONE TERRACE GROUND & RANGOLI FLOOR ---
def create_environment(mats):
    # Ground Courtyard Stone
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=4.5, depth=0.2, location=(0, 0, -0.1))
    ground = bpy.context.active_object
    ground.name = "Courtyard_Stone"
    ground.data.materials.append(mats['terrace'])

# --- 6. CINEMATIC STUDIO CAMERA & FESTIVE LIGHTING ---
def setup_camera_and_lights():
    # Camera
    bpy.ops.object.camera_add(location=(0, -3.8, 2.4), rotation=(math.radians(65), 0, 0))
    cam = bpy.context.active_object
    cam.name = "Diwali_Cinematic_Camera"
    cam.data.lens = 45 # 45mm lens for elegant cinematic portrait
    bpy.context.scene.camera = cam

    # Auspicious Warm Studio Key Light
    bpy.ops.object.light_add(type='AREA', radius=2.0, location=(2.5, -2.5, 3.5), rotation=(math.radians(45), math.radians(20), math.radians(-30)))
    key_light = bpy.context.active_object
    key_light.name = "Studio_Key_Warm"
    key_light.data.energy = 85.0
    key_light.data.color = (1.0, 0.9, 0.75)

    # Cool Rim Light (Simulating Midnight Moonlight)
    bpy.ops.object.light_add(type='AREA', radius=2.5, location=(-3.0, 3.0, 3.0), rotation=(math.radians(-50), math.radians(-30), math.radians(140)))
    rim_light = bpy.context.active_object
    rim_light.name = "Moonlight_Rim"
    rim_light.data.energy = 45.0
    rim_light.data.color = (0.65, 0.75, 1.0)

# ==============================================================================
# MAIN ORCHESTRATOR
# ==============================================================================
def main():
    print("✨ Starting Blender 3D Diwali Scene Generation...")
    clean_scene()
    mats = create_materials()

    # 1. Environment Floor
    create_environment(mats)

    # 2. Central Panch-Pradip Brass Aarti Lamp
    create_panch_pradip(loc=(0, 0, 0), mats=mats)

    # 3. Clay Terracotta Diyas in concentric circle
    num_diyas = 6
    radius = 1.6
    for i in range(num_diyas):
        angle = (i / num_diyas) * math.pi * 2
        dx = math.cos(angle) * radius
        dy = math.sin(angle) * radius
        create_clay_diya(f"ClayDiya_{i+1}", loc=(dx, dy, 0), rot_z=angle, mats=mats)

    # 4. Floating Lotus Diya on Left
    create_lotus_diya(loc=(-2.2, 0.8, 0), mats=mats)

    # 5. Festive Mithai Platter on Right
    create_mithai_platter(loc=(2.2, 0.8, 0), mats=mats)

    # 6. Camera & Lighting
    setup_camera_and_lights()

    # Output paths
    output_dir = os.path.dirname(os.path.abspath(__file__))
    blend_path = os.path.join(output_dir, "diwali_celebration.blend")
    glb_path = os.path.join(output_dir, "diwali_scene.glb")
    render_path = os.path.join(output_dir, "diwali_render.png")

    # Save Native Blender .blend File
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"✅ Native Blender project saved: {blend_path}")

    # Export Universal .GLB / glTF for Web & Three.js
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=False,
        export_materials='EXPORT',
        export_lights=True
    )
    print(f"✅ Universal GLB model exported: {glb_path}")

    # Render High-Resolution Still Image (EEVEE)
    bpy.context.scene.render.resolution_x = 1920
    bpy.context.scene.render.resolution_y = 1080
    bpy.context.scene.render.filepath = render_path
    bpy.ops.render.render(write_still=True)
    print(f"✅ High-resolution 1080p render complete: {render_path}")

    print("🎉 All 3D Diwali assets generated successfully!")

if __name__ == "__main__":
    main()
