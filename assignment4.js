import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Cube, Axis_Arrows, Textured_Phong} = defs

export class Assignment4 extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // TODO:  Create two cubes, including one with the default texture coordinates (from 0 to 1), and one with the modified
        //        texture coordinates as required for cube #2.  You can either do this by modifying the cube code or by modifying
        //        a cube instance's texture_coords after it is already created.
        const initial_corner_point = vec3( -20,0,-25 );
        const initial_corner_point2 = vec3( -20,0,25 );
        // These two callbacks will step along s and t of the first sheet:
        const row_operation = (s,p) => p ? Mat4.translation( .2,0,0 ).times(p.to4(1)).to3()
            : initial_corner_point;
        const column_operation = (t,p) =>  Mat4.translation( 0,0,.2 ).times(p.to4(1)).to3();
        // These two callbacks will step along s and t of the second sheet:
        const row_operation_2    = (s,p)   => vec3(    -1,2*s-1,Math.random()/2 );
        const column_operation_2 = (t,p,s) => vec3( 2*t-1,2*s-1,Math.random()/2 );
        const row_operation_3 = (s,p) => p ? Mat4.translation( 0,.2,0 ).times(p.to4(1)).to3()
            : initial_corner_point2;
        const column_operation_3 = (t,p) =>  Mat4.translation( .2,0,0 ).times(p.to4(1)).to3();

        this.shapes = {
            box_1: new Cube(),
            box_2: new Cube(),
            axis: new Axis_Arrows(),
            grass : new defs.Grid_Patch( 600, 900, row_operation, column_operation ),
            outer_border_side: new defs.Grid_Patch(15, 650, row_operation, column_operation),
            yard_lines: new defs.Grid_Patch(485, 5, row_operation, column_operation),
            sheet2: new defs.Grid_Patch( 10, 10, row_operation_2, column_operation_2 ),
            sky: new defs.Grid_Patch( 600, 600, row_operation_3, column_operation_3 ),
            upright: new defs.Cylindrical_Tube(1000, 30, [[0,2],[0,1]]),
            football: new defs.Subdivision_Sphere(4),
        }
        console.log(this.shapes.box_1.arrays.texture_coord)


        // TODO:  Create the materials required to texture both cubes with the correct images and settings.
        //        Make each Material from the correct shader.  Phong_Shader will work initially, but when
        //        you get to requirements 6 and 7 you will need different ones.
        this.materials = {
            grass: new Material(new Textured_Phong(), {
                color: hex_color("#009A17"),
            }),
            sky: new Material(new Textured_Phong(), {
                color: hex_color("#00B5E2"),
            }),
            field_lines: new Material(new Textured_Phong(), {
                color: hex_color("#FFFFFF"), ambient: 1
            }),
            texture: new Material(new Textured_Phong(), {
                color: hex_color("#ffffff"),
                ambient: 0.5, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/stars.png")
            }),
            goal: new Material(new Textured_Phong(), {
                color: hex_color("#ffff00")
            }),
            football: new Material(new Textured_Phong(), {
                color: hex_color("#6B3E2E")
            }),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
    }

    display(context, program_state) {
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(40, -4, -25));
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        const light_position = vec4(-80, 50, -10, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 100000)];

        let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();

        // TODO:  Draw the required boxes. Also update their stored matrices.
        // You can remove the following line.
        this.floor_trans = Mat4.identity()
        //const r = Mat4.rotation( Math.PI,   0,1,0 ).t imes( this.r );
        this.shapes.grass.draw( context, program_state, Mat4.translation( 0,0,0 ).times(Mat4.rotation( Math.PI,   0,0,1)), this.materials.grass );
        this.shapes.sky.draw( context, program_state, Mat4.translation(  0,0,0 ).times(Mat4.rotation( Math.PI,   0,1,0 )), this.materials.sky );

        // Draw lines on the field
        this.shapes.outer_border_side.draw(context, program_state, Mat4.translation(-70, 0.01, 10), this.materials.field_lines );
        this.shapes.outer_border_side.draw(context, program_state, Mat4.translation(25, 0.01, 10), this.materials.field_lines );

        for (let line = 1; line < 15; line++) {
            this.shapes.yard_lines.draw(context, program_state, Mat4.translation(-70, 0.01, line*10), this.materials.field_lines);
        }


        //this.shapes.axis.draw(context, program_state, model_transform, this.materials.phong.override({color: hex_color("#ffff00")}));

        // Draw Goal
        let model_transform_base = model_transform.times(Mat4.translation(-40.0, 1.5, -15))
            .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(0.25, 0.25, 10));
        this.shapes.upright.draw(context, program_state, model_transform_base, this.materials.goal);
        let model_transform_horizontal= model_transform.times(Mat4.translation(-40.0, 6.5, -15))
            .times(Mat4.rotation(Math.PI/2, 0, 1, 0))
            .times(Mat4.scale(0.25, 0.25, -15));
        this.shapes.upright.draw(context, program_state, model_transform_horizontal, this.materials.goal);
        let model_transform_left = model_transform.times(Mat4.translation(-47.5, 11.25, -15))
            .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(0.25, 0.25, 10));
        this.shapes.upright.draw(context, program_state, model_transform_left, this.materials.goal);
        let model_transform_right = model_transform.times(Mat4.translation(-32.5, 11.25, -15))
            .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(0.25, 0.25, 10));
        this.shapes.upright.draw(context, program_state, model_transform_right, this.materials.goal);

        // Initialize football
        let model_transform_football = model_transform.times(Mat4.translation(-40, 1.5, 10))
            .times(Mat4.scale(0.75, 1.5, 0.75));
        this.shapes.football.draw(context, program_state, model_transform_football, this.materials.football);
    }
}


class Texture_Scroll_X extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                // Sample the texture image in the correct place:
                vec4 tex_color = texture2D( texture, f_tex_coord);
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}


class Texture_Rotate extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #7.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            void main(){
                // Sample the texture image in the correct place:
                vec4 tex_color = texture2D( texture, f_tex_coord );
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}

