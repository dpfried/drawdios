function productions(lhs) {
    return grammar.filter(function (s) { 
        return s.lhs == lhs; 
    });
}

function is_nonterminal(symbol) {
    return symbol.name;
}

function is_equiv_class(symbol) {
    return is_nonterminal(symbol) && symbol.name[0] == 'E';
}

function is_production(symbol) {
    return is_nonterminal(symbol) && symbol.name[0] == 'P';
}

function expand_symbol(symbol, probability) {
    if (is_nonterminal(symbol)) {
        if (is_production(symbol)) {
            var obj = new Object();
            obj.name = symbol.name;
            var prods = productions(symbol.name);
            if (prods.length == 0) {
                alert('no productions found for ' + symbol.name);
            }
            obj.children = productions(symbol.name)[0].rhs.map(function(p) { return expand_symbol(p); });
            obj.probability = probability;
            return obj;
        }
        else if (is_equiv_class(symbol)) {
            var prods = productions(symbol.name);
            var obj = new Object();
            obj.name = symbol.name;
            if (prods.length == 0) {
                alert('no equivalence classes found for ' + symbol.name);
            }
            prods.sort(function(p, q) { return q.prob - p.prob });
            children = prods.map(function(p) { return expand_symbol(p.rhs[0], p.prob); });
            obj.children = children;
            obj.probability = probability;
            return obj
        }
    }
    else {
        var obj = new Object();
        obj.name = symbol;
        obj.probability = probability;
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

function process_input() {
    var to_graph = split_whitespace($('#prods').val().replace(/"/g, ' '));
    console.log(to_graph);
    var obj = new Object();
    if (to_graph.length > 1) {
        obj.name = "S";
        obj.children = to_graph.map(function (s) { return expand_symbol({'name': s}); });
    }
    else {
        obj = expand_symbol({'name': to_graph[0]});
    }
    draw_tree(obj);
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

var m = [20, 120, 20, 120],
    w = 1280 - m[1] - m[3],
    h = 800 - m[0] - m[2],
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

function update(source) {
    var duration = d3.event && d3.event.altKey ? 5000 : 500;

    // Compute the new tree layout.
    var nodes = tree.nodes(root).reverse();

    // Normalize for fixed-depth.
    //nodes.forEach(function(d) { d.y = d.depth * 180; });

    // Update the nodesâ¦
    var node = vis.selectAll("g.node")
        .data(nodes, function(d) { return d.id || (d.id = ++i); });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
        .on("click", function(d) { toggle(d); update(d); })
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
        .text(function(d) { return d.name + (d.probability ? ' [' + percentage(d.probability) + ']' : ''); })
        .style("fill-opacity", 1e-6);

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
        .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
        .remove();

    nodeExit.select("circle")
        .attr("r", 1e-6);

    nodeExit.select("text")
        .style("fill-opacity", 1e-6);

    // Update the linksâ¦
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
function toggle(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
}

function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    }
}

function expand(d) {
    if (d._children) {
        d.children = d._children;
        d._children = null;
    }
}

function collapseAll(d) {
    if (d.children || d._children) {
        (d.children || d._children).map(collapseAll);
    }
    collapse(d);
    update(d);
}

function expandAll(d) {
    expand(d);
    update(d);
    if (d.children || d._children) {
        (d.children || d._children).map(expandAll);
    }
}

function expandBottom(d) {
    if (d._children) {
        expand(d);
        update(d);
    }
    else if (d.children) {
        d.children.map(expandBottom);
    }
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

$(window).on('resize', resize).trigger('resize');
$(document).ready(function() {
    $('#plot').click(process_input);
    $('#collapseAll').click(function() { collapseAll(root); });
    $('#expandAll').click(function() { expandAll(root); });
    $('#expandBottom').click(function() { expandBottom(root); });
});
