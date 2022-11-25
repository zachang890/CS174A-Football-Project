import {defs, tiny} from './examples/common.js';
import {Text_Line} from "./examples/text-demo.js";

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Cube, Axis_Arrows, Basic_Shader} = defs

export class Final_proj extends Scene {
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
        const initial_corner_point = vec3( -50, 0,-45 );
        const initial_corner_point2 = vec3( -50, 0, 45 );
        const initial_lines_corner_point = vec3(-50, 0, -15);
        // These two callbacks will step along s and t of the first sheet:
        const row_operation = (s,p) => p ? Mat4.translation( .2,0,0 ).times(p.to4(1)).to3()
            : initial_corner_point;
        const column_operation = (t,p) =>  Mat4.translation( 0,0,.2 ).times(p.to4(1)).to3();

        const lines_row_operation = (s,p) => p ? Mat4.translation( .2,0,0 ).times(p.to4(1)).to3()
            : initial_lines_corner_point;
        const lines_column_operation = (t,p) =>  Mat4.translation( 0,0,.2 ).times(p.to4(1)).to3();
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
            grass : new defs.Grid_Patch( 1200, 600, row_operation, column_operation ),
            outer_border_side: new defs.Grid_Patch(15, 550, lines_row_operation, lines_column_operation),
            yard_lines: new defs.Grid_Patch(385, 5, lines_row_operation, lines_column_operation),
            sheet2: new defs.Grid_Patch( 10, 10, row_operation_2, column_operation_2 ),
            sky: new defs.Grid_Patch( 600, 1200, row_operation_3, column_operation_3 ),
            upright: new defs.Cylindrical_Tube(1000, 30, [[0,2],[0,1]]),
            football: new defs.Subdivision_Sphere(4),
            scoreboard: new Cube(),
            score_text: new Text_Line(35)
        }


        // TODO:  Create the materials required to texture both cubes with the correct images and settings.
        //        Make each Material from the correct shader.  Phong_Shader will work initially, but when
        //        you get to requirements 6 and 7 you will need different ones.
        this.materials = {
            grass: new Material(new defs.Phong_Shader(), {
                color: hex_color("#009A17"),
            }),
            sky: new Material(new defs.Phong_Shader(), {
                color: hex_color("#00B5E2"), ambient: 0.1
            }),
            field_lines: new Material(new defs.Phong_Shader(), {
                color: hex_color("#FFFFFF"), ambient: 1
            }),
            goal: new Material(new defs.Phong_Shader, {
                color: hex_color("#ffff00")
            }),
            football: new Material(new defs.Phong_Shader(), {
                color: hex_color("#6B3E2E")
            }),
            scoreboard: new Material(new defs.Phong_Shader(),{
                color: color(.5, .5, .5, 1), ambient: 0,
                diffusivity: .3, specularity: .5, smoothness: 10
            }),
            score_text: new Material(new defs.Textured_Phong(1), {
                ambient: 1, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/text.png")
            })
        }

        this.level_finished = true;
        this.football_x = 0;
        this.football_z = 0;

        this.level_number = 1;

        this.in_flight = false;
        this.start_flight_time = 0;
        this.start_flight_time_set = false;
        this.kick_completed = false; // True when goal made or if ball kicked but missed goal
        this.goal_made = false; // True when goal made
        this.goal_missed = false; // True when goal missed
        this.bounce_back = 1;

        this.power = 5;
        this.horizontal_angle = 0;
        this.vertical_angle = 45;

        this.score = 0;

        this.reset_angle_power = () => {
            this.power = 5;
            this.horizontal_angle = 0;
            this.vertical_angle = 45;
        }

        this.bounce = 1;
        this.xz_start_flight_time = 0.0;
        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
    }



    make_control_panel() {
        // Control horizontal angle of the kick (only range -45 to 45)
        const horizontal_angle_controls = this.control_panel.appendChild(document.createElement("span"));
        horizontal_angle_controls.style.margin = "30px";
        this.key_triggered_button("Angle Left", ["a"], () =>
        {if (!this.in_flight && this.horizontal_angle > -45) this.horizontal_angle -= 1}, undefined, undefined, undefined, horizontal_angle_controls);
        this.live_string(box => {
            box.textContent = "Horizontal Angle: " + this.horizontal_angle
        }, horizontal_angle_controls);
        this.key_triggered_button("Angle Right", ["d"], () =>
        {if (!this.in_flight && this.horizontal_angle < 45) this.horizontal_angle += 1}, undefined, undefined, undefined, horizontal_angle_controls);

        // Control vertical angle of the kick (only range 0 - 90)
        const vertical_angle_controls = this.control_panel.appendChild(document.createElement("span"));
        vertical_angle_controls.style.margin = "30px";
        this.key_triggered_button("Angle Down", ["s"], () =>
        {if (!this.in_flight && this.vertical_angle > 0) this.vertical_angle -= 1}, undefined, undefined, undefined, vertical_angle_controls);
        this.live_string(box => {
            box.textContent = "Vertical Angle: " + this.vertical_angle
        }, vertical_angle_controls);
        this.key_triggered_button("Angle Up", ["w"], () =>
        {if (!this.in_flight && this.vertical_angle < 90) this.vertical_angle += 1}, undefined, undefined, undefined, vertical_angle_controls);

        // Control power of the kick (only range 1 - 10)
        const power_controls = this.control_panel.appendChild(document.createElement("span"));
        power_controls.style.margin = "30px";
        this.key_triggered_button("Decrease Power", ["o"], () =>
        {if (!this.in_flight && this.power > 1) this.power -= 1}, undefined, undefined, undefined, power_controls);
        this.live_string(box => {
            box.textContent = "Power: " + this.power
        }, power_controls);
        this.key_triggered_button("Increase Power", ["p"], () =>
        {if (!this.in_flight && this.power < 10) this.power += 1}, undefined, undefined, undefined, power_controls);

        this.key_triggered_button("Kick", ["q"], () => {this.in_flight = true;});
        this.key_triggered_button("Reset Score", ["Control", "r"], () => {this.score = 0;});
    }

    display(context, program_state) {
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(40, -4, -70));
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        // Initialize lights
        // const light_position1 = vec4(-105, 20, -10, 1);
        const light_position2 = vec4(-20, 20, -10, 1);
        const light_position3 = vec4(-200,0,-5,1);
        program_state.lights = [
            // new Light(light_position1, color(1, 1, 1, 1), 100000),
            new Light(light_position2, color(1, 1, 1, 1), 100000),
            new Light(light_position3, color(1, 1, 1, 1), 100000)
        ];

        // Initialize program basics
        let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();

        // Draw the environment
        this.shapes.grass.draw( context, program_state, Mat4.translation( 0,0,0 ).times(Mat4.rotation( Math.PI,   0,0,1)), this.materials.grass );
        this.shapes.sky.draw( context, program_state, Mat4.translation(  0,0,0 ).times(Mat4.rotation( Math.PI,   0,1,0 )), this.materials.sky );
        this.shapes.sky.draw( context, program_state, Mat4.translation(-60, 0, 0).times(Mat4.rotation(Math.PI/2, 0, 1, 0)), this.materials.sky );
        this.shapes.sky.draw( context, program_state, Mat4.translation(-170, 0, 0).times(Mat4.rotation(Math.PI/2, 0, 1, 0)), this.materials.sky );

        this.shapes.outer_border_side.draw(context, program_state, Mat4.translation(-60, 0.01, 10), this.materials.field_lines );
        this.shapes.outer_border_side.draw(context, program_state, Mat4.translation(15, 0.01, 10), this.materials.field_lines );

        for (let line = 1; line < 15; line++) {
            this.shapes.yard_lines.draw(context, program_state, Mat4.translation(-60, 0.01, line*10), this.materials.field_lines);
        }

        // Draw scoreboard
        let scoreboard_transform_base = Mat4.translation(-100, 10, -10).times(Mat4.rotation(Math.PI/4, 0, 1, 0)).times(Mat4.scale(10,6,1))
        this.shapes.scoreboard.draw(context, program_state, scoreboard_transform_base, this.materials.scoreboard)
        let strings = ["", "", "", "", "\n\n\n  HOME   AWAY \n\n\n\n" + `   ${this.score < 10 ? 0 : Math.floor(this.score/10)}${this.score%10}     00   `
            + "\n\n\n\n\n\n\n\n\n\n\n\n\n\n  DOWN   QTR  \n\n\n\n    4     1  ", "", ]
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 2; j++) {             // Find the matrix for a basis located along one of the cube's sides:
                let cube_side = Mat4.rotation(i == 0 ? Math.PI / 2 : 0, 1, 0, 0)
                    .times(Mat4.rotation(Math.PI * j - (i == 1 ? Math.PI / 2 : 0), 0, 1, 0))
                    .times(Mat4.translation(-.9, .9, 1.01));

                const multi_line_string = strings[2 * i + j].split('\n');
                // Draw a Text_String for every line in our string, up to 30 lines:
                for (let line of multi_line_string.slice(0, 30)) {             // Assign the string to Text_String, and then draw it.
                    this.shapes.score_text.set_string(line, context.context);
                    this.shapes.score_text.draw(context, program_state, scoreboard_transform_base.times(cube_side)
                        .times(Mat4.scale(.09, .09, .09)), this.materials.score_text);
                    cube_side.post_multiply(Mat4.translation(0, -.06, 0));
                }
            }

        // Draw uprights
        let model_transform_base = model_transform.times(Mat4.translation(-72.5, 1.5, -10))
            .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(0.25, 0.25, 10));
        this.shapes.upright.draw(context, program_state, model_transform_base, this.materials.goal);
        let model_transform_horizontal= model_transform.times(Mat4.translation(-72.5, 6.5, -10))
            .times(Mat4.rotation(Math.PI/2, 0, 1, 0))
            .times(Mat4.scale(0.25, 0.25, -15));
        this.shapes.upright.draw(context, program_state, model_transform_horizontal, this.materials.goal);
        let model_transform_left = model_transform.times(Mat4.translation(-80.0, 11.25, -10))
            .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(0.25, 0.25, 10));
        this.shapes.upright.draw(context, program_state, model_transform_left, this.materials.goal);
        let model_transform_right = model_transform.times(Mat4.translation(-65.0, 11.25, -10))
            .times(Mat4.rotation(Math.PI/2, 1, 0, 0))
            .times(Mat4.scale(0.25, 0.25, 10));
        this.shapes.upright.draw(context, program_state, model_transform_right, this.materials.goal);

        // Get goal upright x,y,z coordinates
        let upright_base_y = model_transform_base[1][3];
        let upright_base_z = model_transform_base[2][3];
        let upright_left_x = model_transform_left[0][3];
        let upright_right_x = model_transform_right[0][3];

        // Initialize football at random position on the field only if the level is not finished or if kick complete
        if (this.level_finished || this.kick_completed) {
            // Update score
            if (this.goal_made) {
                this.score += 1;
            }

            // this.football_x = Math.floor(Math.random() * 81 - 80);
            // this.football_z = Math.floor(Math.random() * 51 + 10);
            this.football_x = -Math.floor(Math.random() * 40 + 60);
            this.football_z = Math.floor(Math.random() * 15 + 20);

            // Position the camera right behind the football
            program_state.set_camera(Mat4.translation(-1 * this.football_x, -4, -1 * this.football_z - 12));
            // Mark the level as unfinished
            this.level_finished = false;

            // Initialize variables
            this.kick_completed = false;
            this.in_flight = false;
            this.start_flight_time_set = false;
            this.goal_made = false;
            this.goal_missed = false;
            this.bounce = 1;
        }
        let model_transform_football = model_transform.times(Mat4.translation(this.football_x, 1.5, this.football_z))
            .times(Mat4.scale(0.75, 1.5, 0.75));
        let model_transform_football_camera = model_transform_football;

        // Get football x,y,z coordinates
        let football_current_x = model_transform_football[0][3];
        let football_current_y = model_transform_football[1][3];
        let football_current_z = model_transform_football[2][3];

        // Football has been kicked, model projectile motion
        if (this.in_flight) {
            if (!this.start_flight_time_set) {
                this.start_flight_time = t;
                this.start_flight_time_set = true;
                this.xz_start_flight_time = t;
            }
            let vertical_radians = this.vertical_angle * Math.PI / 180.0;
            let horizontal_radians = this.horizontal_angle * Math.PI / 180.0;

            let rel_t = t - this.start_flight_time;
            let y_pos = -9*rel_t*rel_t + this.power*this.power/this.bounce*Math.sin(vertical_radians)*rel_t + 1.5;
            if (y_pos < 1.0) {
                this.start_flight_time = t;
                this.bounce += 1;
            }

            if (this.bounce > 3) {
                this.kick_completed = true;
                this.reset_angle_power();
            }

            let xz_time = t - this.xz_start_flight_time;

            model_transform_football = model_transform
                .times(Mat4.translation(
                    this.football_x + this.power*this.power*Math.cos(vertical_radians)*Math.sin(horizontal_radians)*xz_time,
                    y_pos,
                    this.football_z + -1*this.power*this.power*Math.cos(vertical_radians)*Math.cos(horizontal_radians)*xz_time));

            model_transform_football_camera = model_transform_football
                .times(Mat4.scale(0.75, 1.5, 0.75));

            model_transform_football = model_transform_football
                .times(Mat4.rotation(t*20, 1, 0, 0))
                .times(Mat4.scale(0.75, 1.5, 0.75));

            // Update x,y,z coordinates of football
            football_current_x = model_transform_football[0][3];
            football_current_y = model_transform_football[1][3];
            football_current_z = model_transform_football[2][3];
            // Check if goal made or missed
            if (football_current_z >= (upright_base_z - 1) &&
                football_current_z <= (upright_base_z + 1) &&
                football_current_x >= upright_left_x &&
                football_current_x <= upright_right_x &&
                football_current_y >= upright_base_y) {
                this.goal_made = true;
            } else if (!this.goal_made && (football_current_z < upright_base_z || football_current_y <= 0 || football_current_y < upright_base_y)) {
                this.goal_missed = true;
            }

            program_state.set_camera(Mat4.inverse(model_transform_football_camera.times(Mat4.translation(0, 0, 20)).times(Mat4.scale(4.0/3.0, 2.0/3.0, 4.0/3.0))));
        }


        // TODO: Collision Detection. After it bounces a number of times, then we set kick_completed = true.
        // Kick complete when football_current_y is 0 (i.e. hit the ground) and goal made or missed
        if (football_current_y <= 0 && (this.goal_made || this.goal_missed)) {
            this.kick_completed = true;
            this.reset_angle_power();
        }

        this.shapes.football.draw(context, program_state, model_transform_football, this.materials.football);

        // TODO: Angle of camera is not exact right now.
        // Set camera angle based on horizontal_angle
        if (!this.in_flight) {
            let horizontal_radians = this.horizontal_angle * Math.PI / 180.0;
            let vertical_radians = (this.vertical_angle - 35) * Math.PI / 180.0;

            // UNCOMMENT THE BELOW LINE

            program_state.set_camera(Mat4.inverse(model_transform_football.times(Mat4.translation(0, 0, 20)).times(Mat4.rotation(0.25*vertical_radians, 1, 0, 0)).times(Mat4.rotation(-0.70*(horizontal_radians), 0, 1, 0)).times(Mat4.scale(4.0/3.0, 2.0/3.0, 4.0/3.0))));
        }
    }
}
