function productions(lhs) {
    return grammar.filter(function (s) { 
        return s.lhs == lhs; 
    });
}

function is_nonterminal(symbol) {
    return ! symbol.is_terminal;
}

function is_terminal(symbol) {
    return symbol.is_terminal;
}

function is_equiv_class(symbol) {
    return is_nonterminal(symbol) && is_equiv_class_name(symbol.name);
}

function is_equiv_class_name(string) {
    return string.match(/E\d+/g);
}

function is_production(symbol) {
    return is_nonterminal(symbol) && is_production_name(symbol.name);
}

function is_production_name(string) {
    return string.match(/P\d+/g) || string == 'S';
}

function expand_symbol(symbol, probability, count) {
    if (is_nonterminal(symbol)) {
        if (is_production(symbol)) {
            var obj = new Object();
            obj.name = symbol.name;
            obj.is_terminal = false;
            var prods = productions(symbol.name);
            if (prods.length == 0) {
                alert('no productions found for ' + symbol.name);
            }
            obj._children = prods[0].rhs.map(function(p) { return expand_symbol(p); });
            obj.probability = probability;
            obj.count = prods[0].count;
            return obj;
        }
        else if (is_equiv_class(symbol)) {
            var prods = productions(symbol.name);
            var obj = new Object();
            obj.name = symbol.name;
            obj.is_terminal = false;
            if (prods.length == 0) {
                alert('no equivalence classes found for ' + symbol.name);
            }
            prods.sort(function(p, q) { return q.prob - p.prob });
            children = prods.map(function(p) { console.debug(p); return expand_symbol(p.rhs[0], p.prob, p.count); });
            obj._children = children;
            obj.probability = probability;
            obj.count = children.map(function(p) { return p.count || 0; }).reduce(function(p, q) { return p + q; });
            return obj
        }
    }
    else {
        var obj = new Object();
        obj.name = symbol.name;
        obj.is_terminal = true;
        obj.probability = probability;
        obj.count = count;
        return obj;
    }
}

function highlight(string, node) {
    if (node.name == string) {
        node.highlighted = true;
    } else {
        node.highlighted = false;
    }
    if (node.children || node._children) {
        (node.children || node._children).map(function(d) { highlight(string, d); });
    }
}

function unhighlight(node) {
    node.highlighted = false;
    if (node.children || node._children) {
        (node.children || node._children).map(function(d) { unhighlight(d); });
    }
}

function split_whitespace(str) {
    //return str.replace(/[^\w\s]|_/g, function ($1) { return ' ' + $1 + ' ';}).replace(/[ ]+/g, ' ').split(' ');
    return str.match(/[\S]+/g);
}

function make_symbol(name) {
    if (is_production_name(name) || is_equiv_class_name(name)) {
        return {'name': name,
                'is_terminal': false };
    }
    else {
        return {'name': name,
                'is_terminal': true };
    }
}

function expand_string(s) {
    /* Create a symbol out of a string, with name s. If s appears to refer to a
     * prod or an equiv class, recursively expand the symbol
     */
    var sym = make_symbol(s);
    if (is_nonterminal(sym)) {
        return expand_symbol(sym);
    }
    else {
        return sym;
    }
}

function process_input() {
    var to_graph = split_whitespace($('#prods').val().replace(/"/g, ' '));
    var obj = new Object();
    if (to_graph.length > 1) {
        obj.name = "S";
        obj._children = to_graph.map(expand_string);
    }
    else {
        obj = expand_string(to_graph[0]);
    }
    return obj;
}

function plot_click() {
    var obj = process_input();
    var depth = parseInt($('#depth').val());
    expandToDepth(obj, isNaN(depth) ? 5 : depth);
    draw_tree(obj);
    $('#sample').removeAttr('disabled');
    $('#sampledSent').text('');
}

function sample_all_click() {
    var sym_list = sample_all();
    $('#prods').val(sym_list.map(function(s) { return s.name; }).join(' '));
    var obj = process_input();
    draw_tree(obj);
    do_sample();
    expand_chosen(root, false);
    $('#sample').removeAttr('disabled');
}

function draw_tree(source) {
    root = source
    root.x0 = h / 2;
    root.y0 = 0;

    function toggleAll(d) {
        if (d.children) {
            d.children.forEach(toggleAll);
            toggle(d);
        }
    }

    update(root);
}

var m = [10, 120, 20, 50],
    w = 1280 - m[1] - m[3],
    h = 680 - m[0] - m[2],
    i = 0,
    root;

var tree = d3.layout.tree()
    .size([h, w]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

var svgWidth = w + m[1] + m[3];
var svgHeight = h + m[0] + m[2];
var vis = d3.select("#body").append("svg:svg")
    .attr('id', 'treeSvg')
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .attr('viewBox', '0 0 ' + svgWidth + ' ' + svgHeight)
    .attr('preserveAspectRatio', 'xMinYMin meet')
    //.attr('pointer-events', 'all')
    .append("svg:g")
    //.call(d3.behavior.zoom().on('zoom', redraw))
    .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

/*
vis.append('svg:rect')
   .attr('width', w)
   .attr('height', h)
   .attr('fill', 'white');
*/

function stroke_width(d) {
    if (d.source.chosen && d.target.chosen) {
        return "5px";
    }
    else {
        return "1.5px";
    }
}

function stroke_color(d) {
    /*
    if (d.source.chosen && d.target.chosen) {
        return "green";
    }
    else 
    */
    if (is_nonterminal(d.source) && is_production(d.source)) {
        return "#e50";
    }
    else {
        return "#ccc";
    }
}

function update(source) {
    var duration = d3.event && d3.event.altKey ? 5000 : 500;

    // Compute the new tree layout.
    var nodes = tree.nodes(root).reverse();

    // Normalize for fixed-depth.
    //nodes.forEach(function(d) { d.y = d.depth * 180; });

    // Update the nodesâ¦
    var node = vis.selectAll("g.node")
        .data(nodes, function(d) { return d.id || (d.id = ++i); });

    var initial_spot = function(d) {
        /* var source_spot = (d.parent || source); */
        var source_spot = source;
        return "translate(" + source_spot.y + ", " + source_spot.x + ")";
    }

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
        .attr("class", "node")
        .attr("transform", initial_spot)
        .on("click", function(d) { toggle(d, true); })
        .on('mouseover', function(d) { highlight(d.name, root); updateColors(); })
        .on('mouseout', function(d) { unhighlight(root); updateColors(); });

    nodeEnter.append("svg:circle")
        .attr("r", 1e-6)
        .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

    percentage = d3.format('%');
    nodeEnter.append("svg:text")
        .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
        .attr("dy", ".35em")
        .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
        .text(function(d) { return d.name + (d.probability ? ' [' + percentage(d.probability) + ']' : '') + (d.count ? ' {' + d.count + '}' : ''); })
        .style("fill-opacity", 1e-6)
        .attr('font-weight', font_weight);

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

    nodeUpdate.select("circle")
        .attr("r", 4.5)
        .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

    nodeUpdate.select("text")
        .style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", initial_spot)
        .remove();

    nodeExit.select("circle")
        .attr("r", 1e-6);

    nodeExit.select("text")
        .style("fill-opacity", 1e-6);

    // Update the links
    var link = vis.selectAll("path.link")
        .data(tree.links(nodes), function(d) { return d.target.id; });

    var stroke_scale = d3.scale.linear().range(["#ccc", "#000"]);

    // Enter any new links at the parent's previous position.
    link.enter().insert("svg:path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
            var o = {x: source.x0, y: source.y0};
            return diagonal({source: o, target: o});
        })
        .attr('stroke', stroke_color)
        .attr('stroke-width', stroke_width)
    /*
        .attr('stroke', function(d) {
            return stroke_scale(d.target.probability || 1.0);
        })
        */
        .transition()
        .duration(duration)
        .attr("d", diagonal);

    // Transition links to their new position.
    link.transition()
        .duration(duration)
        .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(duration)
        .attr("d", function(d) {
            var o = {x: source.x, y: source.y};
            return diagonal({source: o, target: o});
        })
    .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });

    updateColors(source);
}

// Toggle children.
function toggle(node, invalidate) {
    if (node.children) {
        node._children = node.children;
        node.children = null;
    } else {
        node.children = node._children;
        node._children = null;
    }
    if (invalidate) {
        update(node);
    }
}

function collapse(node, invalidate) {
    if (node.children) {
        node._children = node.children;
        node.children = null;
    }
    if (invalidate) {
        update(node);
    }
}

function expand(node, invalidate) {
    if (node._children) {
        node.children = node._children;
        node._children = null;
    }
    if (invalidate) {
        update(node);
    }
}

function collapseAll(node, invalidate) {
    if (node.children || node._children) {
        (node.children || node._children).map( function(d) { collapseAll(d, false); });
    }
    collapse(node, invalidate);
}

function expandAll(node, invalidate) {
    expand(node, invalidate);
    if (node.children || node._children) {
        (node.children || node._children).map(function(d) { expandAll(d, false); });
    }
    if (invalidate) {
        update(node);
    }
}

function expandBottom(node, invalidate) {
    if (node._children) {
        expand(node, true);
    }
    else if (node.children) {
        node.children.map(function(d) { expandBottom(d, false) });
    }
}

function expandToDepth(node, depth, invalidate) {
    if (depth > 0) {
        if (node._children) {
            expand(node, invalidate);
        }
        if (node.children) {
            node.children.map(function (d) { expandToDepth(d, depth - 1, false); });
        }
    }
    if (invalidate) {
        update(node);
    }
}

function expand_chosen(node, invalidate) {
    if (node.chosen) {
        if (node._children) {
            expand(node, true);
        }
        if (node.children) {
            node.children.map(function(d) { expand_chosen(d, false) });
        }
    }
    /*
    if (invalidate) {
        update(node);
    }
    */
}

function redraw() {
    vis.attr('transform', 
            'translate(' + d3.event.translate + ')'
          + 'scale(' + d3.event.scale + ')');
}

function resize() {
    var invAspect = svgHeight / svgWidth;
    var chart = $('#treeSvg');
    var targetHeight = chart.parent().height();
    chart.attr('height', targetHeight);
    chart.attr('width', targetHeight / invAspect);
}

function updateColors() {
    var node = vis.selectAll("g.node");
    var circles = node.selectAll('circle');
    var text = node.selectAll('text');
    circles.attr('stroke', function(d) { return d.highlighted ? 'green' : 'steelblue'; })
           .attr('stroke-width', function(d) { return d.highlighted ? '2.5px' : '1.5px'; });
    text.attr('stroke', function(d) { return d.highlighted ? 'green' : 'black'; })
        .attr('stroke-width', function(d) { return d.highlighted ? '.5px' : '.25px'; });
}

function font_weight(d) {
    /* only bold leaves that are chosen */
    return (d.chosen && !d._children && !d.children) ? 'bold' : 'normal';
}

function updatePathColors() {
    var link = vis.selectAll("path.link");
    link.attr('stroke-width', stroke_width);
    var text = vis.selectAll('text');
    text.attr('font-weight', font_weight);
}


$(window).on('resize', resize).trigger('resize');
$(document).ready(function() {
    $('#plot').click(plot_click);
    $('#collapseAll').click(function() { collapseAll(root, true);  });
    $('#expandAll').click(function() { expandAll(root, true); });
    $('#expandBottom').click(function() { expandBottom(root, true) });
    $('#onlySample').click(function() { collapseAll(root, false); expand_chosen(root, true);  });
    $('#sample').click(do_sample);
    $('#sampleAll').click(sample_all_click);
    $('#depth').val(5);
    grammar = grammars.mtbolt;
});

function binary_le_search(x, xs) {
    var low = 0;
    var high = xs.length;
    while (low < high) {
        var mid = Math.floor((low + high) / 2);
        if (xs[mid] < x) {
            low += 1;
        }
        else {
            high = mid;
        }
    }
    return low;
}

function sample(outcomes, probabilities) {
    var cumulative_sums = [];
    var sum = 0;
    probabilities.map(function (p) { sum += p; cumulative_sums.push(sum); });
    var pos = binary_le_search(Math.random(), cumulative_sums);
    return outcomes[pos];
}

function produce(symbol) {
    var words = [];
    var prods = productions(symbol);
    var probabilities = prods.map(function(d) { return d.prob; });
    production = sample(prods, probabilities);
    production.rhs.map(function(e) {
        if (is_nonterminal(e)) {
            words = words.concat(produce(e.name));
        }
        else {
            words.push(e);
        }
    });
    return words;
}

function traverse(tree, callback) {
    callback(tree);
    if (tree.children || tree._children) {
        (tree.children || tree._children).map(function (n) { traverse(n, callback); });
    }
}

function unchoose(tree) {
    traverse(tree, function(n) { n.chosen = false; });
}

function sample_tree(node) {
    /* traverse the tree, taking one child (sampled according to children's probs)
     * if the current node is an equivalence class, and
     * taking all children if the node is a production.
     * Returns a list of terminals at the bottom of the chosen paths.
     * If a node is taken, set its chosen property to true to allow drawing the tree
     */
    node.chosen = true;
    if (is_nonterminal(node)) {
        if (is_production(node)) {
            /* choose all children */
            if (node.children || node._children) {
                var leaves_list = (node.children || node._children).map(sample_tree);
                return leaves_list.reduce(function(p, c) { return p.concat(c); });
            }
            else {
                return [];
            }
        }
        else if (is_equiv_class(node)) {
            /* sample one child based on probability */
            var children = node.children || node._children
            if (children) {
                var probs = children.map(function(d) { return d.probability; });
                return sample_tree(sample(children, probs));
            }
            else {
                return [];
            }
        }
    }
    else {
        return [node.name];
    }
}

function do_sample() {
    unchoose(root);
    $('#sampledSent').text(sample_tree(root).join(' '));
    expand_chosen(root, true);
    updatePathColors();
}

function sample_all() {
    var sentences = productions('S');
    var sentence = sample(sentences, sentences.map(function(d) { return d.prob; }));
    return sentence.rhs;
}
