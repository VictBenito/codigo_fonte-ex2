
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.7' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.29.7 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (144:4) {#if mensgs>1}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*palavras*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*palavras, de*/ 20) {
    				each_value = /*palavras*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(144:4) {#if mensgs>1}",
    		ctx
    	});

    	return block;
    }

    // (146:8) {#if de != []}
    function create_if_block_1(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*de*/ ctx[2][/*i*/ ctx[15]] + "";
    	let t1;
    	let t2;
    	let t3_value = /*palavra*/ ctx[13] + "";
    	let t3;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("(");
    			t1 = text(t1_value);
    			t2 = text("): ");
    			t3 = text(t3_value);
    			attr_dev(p, "class", "svelte-14kj1mg");
    			add_location(p, file, 146, 10, 3217);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*de*/ 4 && t1_value !== (t1_value = /*de*/ ctx[2][/*i*/ ctx[15]] + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*palavras*/ 16 && t3_value !== (t3_value = /*palavra*/ ctx[13] + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(146:8) {#if de != []}",
    		ctx
    	});

    	return block;
    }

    // (145:6) {#each palavras as palavra, i}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*de*/ ctx[2] != [] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*de*/ ctx[2] != []) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(145:6) {#each palavras as palavra, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let div0;
    	let span;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let div1;
    	let p0;
    	let t7;
    	let p1;
    	let t9;
    	let p2;
    	let t11;
    	let t12;
    	let form;
    	let input;
    	let t13;
    	let button;
    	let mounted;
    	let dispose;
    	let if_block = /*mensgs*/ ctx[0] > 1 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Websockets Web";
    			t1 = space();
    			div0 = element("div");
    			span = element("span");
    			t2 = text("Online (");
    			t3 = text(/*numUsers*/ ctx[1]);
    			t4 = text(")");
    			t5 = space();
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "(Instruções): Bem vindo ao Chat WebSockets de Redes Industriais!";
    			t7 = space();
    			p1 = element("p");
    			p1.textContent = "(Instruções): Para definir seu usúario, digite: \\nome SeuNome";
    			t9 = space();
    			p2 = element("p");
    			p2.textContent = "(Instruções): Para mandar uma mensagem privada para algum dos usuários, digite: \\privado usuário Mensagem";
    			t11 = space();
    			if (if_block) if_block.c();
    			t12 = space();
    			form = element("form");
    			input = element("input");
    			t13 = space();
    			button = element("button");
    			button.textContent = "Send";
    			attr_dev(h1, "class", "svelte-14kj1mg");
    			add_location(h1, file, 133, 2, 2676);
    			attr_dev(span, "class", "users svelte-14kj1mg");
    			add_location(span, file, 136, 4, 2727);
    			attr_dev(div0, "class", "state svelte-14kj1mg");
    			add_location(div0, file, 135, 2, 2703);
    			attr_dev(p0, "class", "servermsg svelte-14kj1mg");
    			add_location(p0, file, 140, 4, 2812);
    			attr_dev(p1, "class", "servermsg svelte-14kj1mg");
    			add_location(p1, file, 141, 4, 2906);
    			attr_dev(p2, "class", "servermsg svelte-14kj1mg");
    			add_location(p2, file, 142, 4, 2997);
    			attr_dev(div1, "class", "chatbox svelte-14kj1mg");
    			add_location(div1, file, 139, 2, 2786);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "usermsg svelte-14kj1mg");
    			add_location(input, file, 152, 4, 3322);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "svelte-14kj1mg");
    			add_location(button, file, 154, 4, 3417);
    			attr_dev(form, "class", "inputbox svelte-14kj1mg");
    			add_location(form, file, 151, 2, 3294);
    			attr_dev(main, "class", "svelte-14kj1mg");
    			add_location(main, file, 132, 0, 2667);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			append_dev(div0, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(span, t4);
    			append_dev(main, t5);
    			append_dev(main, div1);
    			append_dev(div1, p0);
    			append_dev(div1, t7);
    			append_dev(div1, p1);
    			append_dev(div1, t9);
    			append_dev(div1, p2);
    			append_dev(div1, t11);
    			if (if_block) if_block.m(div1, null);
    			append_dev(main, t12);
    			append_dev(main, form);
    			append_dev(form, input);
    			/*input_binding*/ ctx[7](input);
    			set_input_value(input, /*inputText*/ ctx[5]);
    			append_dev(form, t13);
    			append_dev(form, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[8]),
    					listen_dev(button, "click", prevent_default(/*handleClick*/ ctx[6]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*numUsers*/ 2) set_data_dev(t3, /*numUsers*/ ctx[1]);

    			if (/*mensgs*/ ctx[0] > 1) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*inputText*/ 32 && input.value !== /*inputText*/ ctx[5]) {
    				set_input_value(input, /*inputText*/ ctx[5]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    			/*input_binding*/ ctx[7](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let mensgs = 0;
    	let numUsers = 0;
    	let eu = "";
    	let destinatarios = [];
    	let de = [];
    	let nomes = [];
    	const ws = new WebSocket("ws://127.0.0.1:6789");
    	let messageInput;
    	let palavras = [];
    	let inputText = "";

    	onMount(() => {
    		messageInput.focus();
    	});

    	ws.onopen = function () {
    		console.log("Websocket client connected");
    	};

    	ws.onclose = function () {
    		console.log("Websock client disconnected");
    	};

    	ws.onmessage = function (e) {
    		console.log("Received: " + e.data);
    		let data = JSON.parse(e.data);

    		if (data.type == "msg") {
    			$$invalidate(0, mensgs = mensgs + 1);
    			console.log(palavras);
    			$$invalidate(4, palavras = [...palavras, data.msg]);
    			console.log(palavras);
    			destinatarios = [...destinatarios, data.para];
    			$$invalidate(2, de = [...de, data.nome]);
    			$$invalidate(5, inputText = "");
    		} else if (data.type == "users") {
    			$$invalidate(1, numUsers = data.count);
    		} else {
    			console.error("unsupported event", data);
    		}
    	};

    	function handleClick() {
    		console.log(inputText);

    		if (inputText.startsWith("/nome ")) {
    			ws.send(JSON.stringify({
    				"msg": inputText.slice(6),
    				"para": "Todos",
    				"nome_certo": "False",
    				"normal": "False"
    			}));
    		} else if (inputText.startsWith("/privado ")) {
    			var priv = inputText.split(" ");
    			var priv2 = priv[1].length;

    			ws.send(JSON.stringify({
    				"msg": inputText.slice(priv2 + 9),
    				"para": priv[1],
    				"nome_certo": "True",
    				"normal": "False"
    			}));
    		} else if (eu != null) {
    			ws.send(JSON.stringify({
    				"msg": inputText,
    				"para": "Todos",
    				"nome_certo": "True",
    				"normal": "True"
    			}));
    		} else {
    			console.error("unsupported event", data);
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			messageInput = $$value;
    			$$invalidate(3, messageInput);
    		});
    	}

    	function input_input_handler() {
    		inputText = this.value;
    		$$invalidate(5, inputText);
    	}

    	$$self.$capture_state = () => ({
    		mensgs,
    		numUsers,
    		eu,
    		destinatarios,
    		de,
    		nomes,
    		ws,
    		onMount,
    		messageInput,
    		palavras,
    		inputText,
    		handleClick
    	});

    	$$self.$inject_state = $$props => {
    		if ("mensgs" in $$props) $$invalidate(0, mensgs = $$props.mensgs);
    		if ("numUsers" in $$props) $$invalidate(1, numUsers = $$props.numUsers);
    		if ("eu" in $$props) eu = $$props.eu;
    		if ("destinatarios" in $$props) destinatarios = $$props.destinatarios;
    		if ("de" in $$props) $$invalidate(2, de = $$props.de);
    		if ("nomes" in $$props) nomes = $$props.nomes;
    		if ("messageInput" in $$props) $$invalidate(3, messageInput = $$props.messageInput);
    		if ("palavras" in $$props) $$invalidate(4, palavras = $$props.palavras);
    		if ("inputText" in $$props) $$invalidate(5, inputText = $$props.inputText);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		mensgs,
    		numUsers,
    		de,
    		messageInput,
    		palavras,
    		inputText,
    		handleClick,
    		input_binding,
    		input_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		//name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
