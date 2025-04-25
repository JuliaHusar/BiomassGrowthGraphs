import * as d3 from "d3";
import * as ss from "simple-statistics"
import {linearRegressionLine} from "simple-statistics"
//Logarithmic regression equation derived: y a + blnx
// y= 2.8348 + 0.4204ln(x) r value = 0.9729
export function calculateLogarithmicRegression(biomassData) {
    const xValues = getAccurateXValues(biomassData);
    const yValues = biomassData.map((d) => d.Biomass_g_L);
    const n = xValues.length;

    const sum_xlogy = xValues.reduce((sum, x, i) => sum + Math.log(x) * yValues[i], 0);
    const sum_logx = xValues.reduce((sum, x) => sum + Math.log(x), 0);
    const sum_y = yValues.reduce((sum, y) => sum + y, 0);
    const sum_logx_sq = xValues.reduce((sum, x) => sum + Math.pow(Math.log(x), 2), 0);
    const b = (n * sum_xlogy - sum_logx * sum_y) / (n * sum_logx_sq - Math.pow(sum_logx, 2));
    const a = (sum_y - b * sum_logx) / n;
    return { a, b };
}
export function calculateLogisticRegression(biomassData) {
    const startDate = d3.min(biomassData, d => new Date(d.collection_date));
    const xValues = biomassData.map(d => ((new Date(d.collection_date) - startDate) / (1000 * 60 * 60 * 24)) + 1);
    const yValues = biomassData.map(d => d.Biomass_g_L);

    const a = d3.max(yValues);

    const halfA = a / 2;
    let c = xValues[0];
    let minDiff = Math.abs(yValues[0] - halfA);
    for (let i = 1; i < yValues.length; i++) {
        const diff = Math.abs(yValues[i] - halfA);
        if (diff < minDiff) {
            minDiff = diff;
            c = xValues[i];
        }
    }

    const valid = yValues.filter(y => y > 0 && y < a);
    const xs = xValues.filter((_, i) => yValues[i] > 0 && yValues[i] < a);
    const ys = valid.map(y => Math.log(a / y - 1));
    const meanX = d3.mean(xs);
    const meanY = d3.mean(ys);
    const num = d3.sum(xs.map((x, i) => (x - meanX) * (ys[i] - meanY)));
    const den = d3.sum(xs.map(x => (x - meanX) ** 2));
    const b = -num / den;

    return { a, b, c };
}
export function getAccurateXValues(biomassData){
    const startDate = d3.min(biomassData, d => new Date(d.collection_date));
    const passedXValues = biomassData.map(d => {
        const currentDate = new Date(d.collection_date);
        return (currentDate - startDate) / (1000 * 60 * 60 * 24);
    });
    return passedXValues.map(d => d + 1);
}
export function getLogXValues(biomassData) {
    const startDate = d3.min(biomassData, d => new Date(d.collection_date));
    const passedXValues = biomassData.map(d => {
        const currentDate = new Date(d.collection_date);
        return (currentDate - startDate) / (1000 * 60 * 60 * 24);
    });
    const result = passedXValues.map(d => d + 1);
    if (result.length > 0) {
        result[0] = 0.01;
    }
    return result;
}

export function calculateLinearRegression(biomassData) {
    const startDate = d3.min(biomassData, d => new Date(d.collection_date));
    const xValues = biomassData.map(d => ((new Date(d.collection_date) - startDate) / (1000 * 60 * 60 * 24)) + 1);
    const yValues = biomassData.map(d => d.Biomass_g_L);

    const inputs = xValues.map((x, i) => [x, yValues[i]]);
    const regression = ss.linearRegression(xValues.map((x, i) => [x, yValues[i]]));
    const regressionLine = linearRegressionLine(regression);
    const predicted = xValues.map(x => regressionLine(x));
    const rSquared = ss.rSquared(inputs, regressionLine);

    return {
        slope: regression.m,
        intercept: regression.b,
        rSquared: rSquared
    };
}
export const returnMultivariateRegression = () => {
    const modelSlope = 0.037711;
    const modelIntercept = 3.806281;
    const RMSE = 0.054629
    return {
        slope: modelSlope,
        intercept: modelIntercept,
        RMSE: RMSE
    };
}

export function getSlope(point1, point2) {
    return (point2.y - point1.y) / (point2.x - point1.x);
}

export function getSlopeThreshold(biomassData){
    const slopeMap = {};
    const startDate = d3.min(biomassData, d => new Date(d.collection_date));
    let concatedData = biomassData.map(d => {
        return {
            x: (new Date(d.collection_date) - startDate) / (1000 * 60 * 60 * 24),
            y: d.Biomass_g_L
        }
    })
    for (let i = 0; i < biomassData.length; i++) {
        if(i !== concatedData.length -1){
            let point1 = concatedData[i]
            let point2 = concatedData[i+1]
            let slope = getSlope(point1, point2)
            slopeMap[biomassData[i].collection_date] = {
                x: point1.x,
                y: slope,
                dateRange: [biomassData[i].collection_date, biomassData[i+1].collection_date]
            }
        } else {
            return slopeMap;
        }
    }
    return slopeMap;
}