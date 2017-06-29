const expect = require('expect.js');
const sinon = require('sinon');
const {createNode} = require('@snakesilk/testing/xml');

const {Entity, Loader, Traits} = require('@snakesilk/engine');
const TraitParser = require('../TraitParser');

describe('TraitParser', function() {
    let parser, Trait;

    beforeEach(() => {
        parser = new TraitParser(new Loader());
    });

    [
        ['attach', 'Attach'],
        ['climbable', 'Climbable'],
        ['climber', 'Climber'],
        ['contact-damage', 'ContactDamage'],
        ['conveyor', 'Conveyor'],
        ['death-spawn', 'DeathSpawn'],
        ['death-zone', 'DeathZone'],
        ['destructible', 'Destructible'],
        ['disappearing', 'Disappearing'],
        ['door', 'Door'],
        ['elevator', 'Elevator'],
        ['environment', 'Environment'],
        ['fallaway', 'Fallaway'],
        ['fixed-force', 'FixedForce'],
        ['glow', 'Glow'],
        ['headlight', 'Headlight'],
        ['health', 'Health'],
        ['invincibility', 'Invincibility'],
        ['jump', 'Jump'],
        ['lifetime', 'Lifetime'],
        ['light', 'Light'],
        ['light-control', 'LightControl'],
        ['move', 'Move'],
        ['physics', 'Physics'],
        ['pickupable', 'Pickupable'],
        ['projectile', 'Projectile'],
        ['rotate', 'Rotate'],
        ['solid', 'Solid'],
        ['spawn', 'Spawn'],
        ['stun', 'Stun'],
        ['teleport', 'Teleport'],
        ['translate', 'Translate'],
        ['translating', 'Translating'],
        ['weapon', 'Weapon'],
    ].forEach(([xmlName, traitName]) => {
        const xmlString = `<trait name="${xmlName}"/>`;

        describe(`when parsing ${xmlString}`, () => {
            beforeEach(() => {
              const node = createNode(xmlString);
              Trait = parser.parseTrait(node);
            });

            it(`produces a ${traitName} trait`, () => {
              expect(new Trait()).to.be.a(Traits[traitName]);
            });
        });
    });

    describe('Door', () => {
        describe('when parsing defaults', () => {
            beforeEach(() => {
                const node = createNode('<trait name="door"/>');
                Trait = parser.parseTrait(node);
            });

            it('defaults to universal direction', () => {
                const trait = new Trait();
                expect(trait.direction).to.eql({x: 0, y: 0});
            });

            it('defaults to two way', () => {
                const trait = new Trait();
                expect(trait.oneWay).to.be(false);
            });
        });

        describe('when supplying properties', () => {
            beforeEach(() => {
                const node = createNode(`<trait name="door" one-way="true">
                    <direction x="13" y="17"/>
                </trait>`);
                Trait = parser.parseTrait(node);
            });

            it('honors direction', function() {
              const trait = new Trait();
              expect(trait.direction).to.be.eql({x: 13, y: 17});
            });

            it('honors one-way', function() {
              const trait = new Trait();
              expect(trait.oneWay).to.be(true);
            });
        });
    });

    describe('Solid', () => {
        describe('when parsing defaults', () => {
            beforeEach(() => {
                const node = createNode('<trait name="solid"/>');
                Trait = parser.parseTrait(node);
            });

            it('defaults to all surfaces', function() {
                const trait = new Trait();
                expect(trait.attackAccept).to.eql([
                    trait.TOP, trait.BOTTOM, trait.LEFT, trait.RIGHT
                ]);
            });
        });

        describe('when supplying single attack surface', () => {
            beforeEach(() => {
                const node = createNode('<trait name="solid" attack="top"/>');
                Trait = parser.parseTrait(node);
            });

            it('honors attribute', function() {
                const trait = new Trait();
                expect(trait.attackAccept).to.eql([trait.TOP]);
            });
        });

        describe('when supplying space-separated attack surfaces', () => {
            beforeEach(() => {
                const node = createNode('<trait name="solid" attack="bottom left right"/>');
                Trait = parser.parseTrait(node);
            });

            it('honors all surfaces given', () => {
                const trait = new Trait();
                expect(trait.attackAccept).to.eql([trait.BOTTOM, trait.LEFT, trait.RIGHT]);
            });
        });
    });

    describe('Spawn', () => {
        describe('when parsing using undefined object', () => {
            it('raises an exception', () => {
                expect(() => {
                    const node = createNode(`<trait name="spawn">
                        <item event="recycle" object="UndefinedObject"/>
                    </trait>`);
                    Trait = parser.parseTrait(node);
                }).to.throwError(error => {
                    expect(error).to.be.a(Error);
                    expect(error.message).to.be('No resource "UndefinedObject" of type object');
                });
            });
        });

        describe('when parsing with single item defined', () => {
            beforeEach(() => {
                parser.loader.resourceManager.addObject('Explosion', Entity);
                const node = createNode(`<trait name="spawn">
                    <item event="recycle" object="Explosion"/>
                </trait>`);
                Trait = parser.parseTrait(node);
            });

            it('discovers a single item', () => {
                trait = new Trait();
                expect(trait._conditions).to.have.length(1);
            });

            describe('discvered item', () => {
                it('honors event', () => {
                    expect(trait._conditions[0].event).to.be('recycle');
                });
            });
        });

        describe('when parsing with multiple items', () => {
            beforeEach(() => {
                parser.loader.resourceManager.addObject('Explosion', Entity);
                parser.loader.resourceManager.addObject('Blast', Entity);
                const node = createNode(`<trait name="spawn">
                    <item event="recycle" object="Explosion"/>
                    <item event="blast" object="Blast">
                        <offset x="13" y="11" z="5"/>
                    </item>
                </trait>`);
                Trait = parser.parseTrait(node);
            });

            it('discovers multiple items', () => {
              trait = new Trait();
              expect(trait._conditions).to.have.length(2);
            });
        });

        it.skip('should provide a default offset', () => {
          spawn._conditions[0].callback.call(hostMock);
          expect(hostMock.world.addObject.callCount).to.be(1);
          const spawned = hostMock.world.addObject.lastCall.args[0];
          expect(spawned).to.be.a(Obj);
          expect(spawned.position).to.eql({x: 3, y: 5, z: 0});
        });

        it.skip('should honor parsed offset', () => {
          spawn._conditions[1].callback.call(hostMock);
          expect(hostMock.world.addObject.callCount).to.be(1);
          const spawned = hostMock.world.addObject.lastCall.args[0];
          expect(spawned).to.be.a(Obj);
          expect(spawned.position).to.eql({x: 3 + 13, y: 5 + 11, z: 0 + 5});
        });
    });
});
