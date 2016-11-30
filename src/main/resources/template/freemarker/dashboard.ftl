<#include "header.ftl">
<div id="dashboard">
    <input class="button" id="quit-button" name="dashboard-quit" onclick="window.location='/select-project'" value="Quit" type="button">
    <div id="image-analysis-pane"></div>
    <div id="sidebar">
        <div id="sidebar-contents">
            <fieldset>
                <legend>1. Select Project</legend>
                <select name="project-id" size="1" id="project-id">
                    <option value="1">Mekong River Region</option>
                    <option value="12">Mekong_River_Sample</option>
                    <option value="14">Lower Mekong Region</option>
                    <option value="15">Myanmar_Landcover Classification</option>
                    <option value="16">MK_Laos</option>
                    <option value="18">Classification of land Cover</option>
                    <option value="19">Cambodia</option>
                    <option value="20">Cambodia Land Cover</option>
                    <option value="23">MK_VN</option>
                    <option value="24">DN_VN</option>
                    <option value="25">CM_VN</option>
                    <option value="26">Myanmar_landcover</option>
                    <option value="37">DN2</option>
                    <option value="38">DN2_2</option>
                    <option value="39">FAO Regional Subset Collection</option>
                    <option value="40">FAO_Test</option>
                    <option value="41">FAO Regional Subset Collection v2</option>
                    <option value="42">FAO Test 2</option>
                    <option value="45">Myanmar_test</option>
                    <option value="47">Gridded Sample Test</option>
                    <option value="49">SCO_test</option>
                    <option value="50">Bing Maps Test</option>
                    <option value="53">HB Blowdown 2</option>
                    <option value="54">HB Blowdown 3</option>
                    <option value="55">TEST FAO</option>
                </select>
                <input name="new-plot" value="2. Analyze New Plot" id="new-plot-button" class="button" type="button">
            </fieldset>
            <fieldset>
                <legend>3. Assign Values</legend>
                <ul>
                    <li>
                        <input name="Forest_1" value="Forest" style="border-left: 1.5rem solid rgb(30, 198, 27);" type="button">
                    </li>
                    <li>
                        <input name="Grassland_2" value="Grassland" style="border-left: 1.5rem solid rgb(156, 241, 53);" type="button">
                    </li>
                    <li>
                        <input name="Bare Surface_3" value="Bare Surface" style="border-left: 1.5rem solid rgb(213, 222, 133);" type="button">
                    </li>
                    <li>
                        <input name="Impervious Surface_4" value="Impervious Surface" style="border-left: 1.5rem solid rgb(139, 144, 132);" type="button">
                    </li>
                    <li>
                        <input name="Agriculture_5" value="Agriculture" style="border-left: 1.5rem solid rgb(242, 198, 19);" type="button">
                    </li>
                    <li>
                        <input name="Urban_6" value="Urban" style="border-left: 1.5rem solid rgb(106, 58, 117);" type="button">
                    </li>
                    <li>
                        <input name="Water_7" value="Water" style="border-left: 1.5rem solid rgb(47, 77, 192);" type="button">
                    </li>
                    <li>
                        <input name="Cloud_8" value="Cloud" style="border-left: 1.5rem solid rgb(255, 255, 255);" type="button">
                    </li>
                    <li>
                        <input name="Unknown_9" value="Unknown" style="border-left: 1.5rem solid rgb(0, 0, 0);" type="button">
                    </li>
                </ul>
                <div id="final-plot-options">
                    <table>
                        <tbody>
                            <tr>
                                <td>4.</td>
                                <td>Either</td>
                                <td>
                                    <input name="save-values" value="Save Assignments" id="save-values-button" class="button" disabled="" style="opacity: 0.5;" type="button">
                                </td>
                            </tr>
                            <tr>
                                <td> </td>
                                <td>or</td>
                                <td>
                                    <input name="flag-plot" value="Flag Plot as Bad" id="flag-plot-button" class="button" disabled="" style="opacity: 0.5;" type="button">
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </fieldset>
        </div>
    </div>
    <div id="imagery-info">
        <p>DigitalGlobe Maps API: Recent Imagery+Streets | June 2015 |
        © DigitalGlobe, Inc</p>
    </div>
    <input id="user-id" name="user-id" value=${user_id} type="hidden">
    <input id="initial-project-id" name="initial-project-id" value=${project_id} type="hidden">
</div>
<#include "footer.ftl">
