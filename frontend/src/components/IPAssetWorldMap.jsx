import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import worldJson from './world.json'; // Ensure this path is correct based on where we downloaded it

const IPAssetWorldMap = () => {
    const [options, setOptions] = useState({});

    useEffect(() => {
        // Register the map
        echarts.registerMap('world', worldJson);

        // Dummy Data
        const data = [
            { name: "United States", value: 80 },
            { name: "China", value: 150 },
            { name: "India", value: 110 },
            { name: "Germany", value: 60 },
            { name: "United Kingdom", value: 70 }
        ];

        const chartOptions = {
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} IP Assets',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderColor: '#ccc',
                borderWidth: 1,
                textStyle: {
                    color: '#333'
                }
            },
            visualMap: {
                min: 0,
                max: 160,
                text: ['High', 'Low'],
                realtime: false,
                calculable: true,
                inRange: {
                    color: ['#e9d5ff', '#a855f7', '#6b21a8', '#3b0764'] // Light purple to deep indigo/purple
                },
                left: 'right',
                bottom: '10',
                padding: [0, 20, 0, 0] // Add some padding from right edge
            },
            series: [
                {
                    name: 'IP Assets',
                    type: 'map',
                    mapType: 'world',
                    roam: false, // Disable zooming and panning
                    // Adjust positioning to ensure map is visible and centered
                    top: '10%',
                    bottom: '10%',
                    left: '5%',
                    right: '5%',
                    layoutCenter: ['50%', '50%'],
                    layoutSize: '130%', // Zoom in slightly to fill space better
                    emphasis: {
                        label: {
                            show: true,
                            color: '#fff'
                        },
                        itemStyle: {
                            areaColor: '#c084fc' // Highlight color on hover
                        }
                    },
                    itemStyle: {
                        areaColor: '#cbd5e1', // Darker gray (slate-300) for better visibility
                        borderColor: '#fff'
                    },
                    data: data
                }
            ]
        };

        setOptions(chartOptions);
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '0.75rem' }}>
            {Object.keys(options).length > 0 && (
                <ReactECharts
                    option={options}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                />
            )}
        </div>
    );
};

export default IPAssetWorldMap;
